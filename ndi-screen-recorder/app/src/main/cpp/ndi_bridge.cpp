// Ponte entre o app (Kotlin) e a biblioteca oficial NDI (libndi.so).
// As estruturas abaixo espelham o layout binário de Processing.NDI.*.h (SDK NDI 5/6).
#include <jni.h>
#include <dlfcn.h>
#include <android/log.h>
#include <cstdint>
#include <mutex>
#include <vector>

#define LOG_TAG "TelaNDI-Native"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace {

constexpr int32_t fourcc(char a, char b, char c, char d) {
    return static_cast<int32_t>(static_cast<uint32_t>(static_cast<uint8_t>(a)) |
                                (static_cast<uint32_t>(static_cast<uint8_t>(b)) << 8) |
                                (static_cast<uint32_t>(static_cast<uint8_t>(c)) << 16) |
                                (static_cast<uint32_t>(static_cast<uint8_t>(d)) << 24));
}

constexpr int32_t kFourCC_RGBX = fourcc('R', 'G', 'B', 'X');
constexpr int32_t kFrameFormatProgressive = 1;
constexpr int64_t kTimecodeSynthesize = INT64_MAX;

struct NdiSendCreate {
    const char* p_ndi_name;
    const char* p_groups;
    bool clock_video;
    bool clock_audio;
};

struct NdiVideoFrameV2 {
    int xres;
    int yres;
    int32_t FourCC;
    int frame_rate_N;
    int frame_rate_D;
    float picture_aspect_ratio;
    int32_t frame_format_type;
    int64_t timecode;
    uint8_t* p_data;
    int line_stride_in_bytes;
    const char* p_metadata;
    int64_t timestamp;
};

struct NdiAudioFrameV2 {
    int sample_rate;
    int no_channels;
    int no_samples;
    int64_t timecode;
    float* p_data;
    int channel_stride_in_bytes;
    const char* p_metadata;
    int64_t timestamp;
};

struct NdiApi {
    void* lib = nullptr;
    bool initialized = false;
    bool (*initialize)() = nullptr;
    const char* (*version)() = nullptr;
    void* (*send_create)(const NdiSendCreate*) = nullptr;
    void (*send_destroy)(void*) = nullptr;
    void (*send_video_v2)(void*, const NdiVideoFrameV2*) = nullptr;
    void (*send_audio_v2)(void*, const NdiAudioFrameV2*) = nullptr;
    int (*get_no_connections)(void*, uint32_t) = nullptr;
};

NdiApi g_api;
std::mutex g_mutex;

template <typename T>
bool loadSymbol(void* lib, const char* name, T& out) {
    out = reinterpret_cast<T>(dlsym(lib, name));
    if (!out) LOGE("Símbolo ausente em libndi.so: %s", name);
    return out != nullptr;
}

bool ensureLoaded() {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (g_api.initialized) return true;
    if (!g_api.lib) {
        g_api.lib = dlopen("libndi.so", RTLD_NOW | RTLD_LOCAL);
        if (!g_api.lib) {
            LOGE("libndi.so não encontrada: %s", dlerror());
            return false;
        }
    }
    bool ok = loadSymbol(g_api.lib, "NDIlib_initialize", g_api.initialize) &&
              loadSymbol(g_api.lib, "NDIlib_version", g_api.version) &&
              loadSymbol(g_api.lib, "NDIlib_send_create", g_api.send_create) &&
              loadSymbol(g_api.lib, "NDIlib_send_destroy", g_api.send_destroy) &&
              loadSymbol(g_api.lib, "NDIlib_send_send_video_v2", g_api.send_video_v2) &&
              loadSymbol(g_api.lib, "NDIlib_send_send_audio_v2", g_api.send_audio_v2) &&
              loadSymbol(g_api.lib, "NDIlib_send_get_no_connections", g_api.get_no_connections);
    if (!ok) return false;
    if (!g_api.initialize()) {
        LOGE("NDIlib_initialize falhou (processador não suportado?)");
        return false;
    }
    g_api.initialized = true;
    LOGI("NDI carregado: %s", g_api.version());
    return true;
}

struct Sender {
    void* instance;
    std::vector<float> planar;  // buffer reutilizado para o áudio (float planar)
};

}  // namespace

extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_telandi_recorder_ndi_NdiNative_nativeLoad(JNIEnv*, jobject) {
    return ensureLoaded() ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jstring JNICALL
Java_com_telandi_recorder_ndi_NdiNative_nativeVersion(JNIEnv* env, jobject) {
    if (!ensureLoaded()) return nullptr;
    return env->NewStringUTF(g_api.version());
}

JNIEXPORT jlong JNICALL
Java_com_telandi_recorder_ndi_NdiNative_nativeCreateSender(JNIEnv* env, jobject, jstring name) {
    if (!ensureLoaded()) return 0;
    const char* cname = env->GetStringUTFChars(name, nullptr);
    NdiSendCreate desc{cname, nullptr, false, false};
    void* instance = g_api.send_create(&desc);
    env->ReleaseStringUTFChars(name, cname);
    if (!instance) {
        LOGE("NDIlib_send_create falhou");
        return 0;
    }
    return reinterpret_cast<jlong>(new Sender{instance, {}});
}

JNIEXPORT void JNICALL
Java_com_telandi_recorder_ndi_NdiNative_nativeDestroySender(JNIEnv*, jobject, jlong handle) {
    auto* sender = reinterpret_cast<Sender*>(handle);
    if (!sender) return;
    g_api.send_destroy(sender->instance);
    delete sender;
}

JNIEXPORT void JNICALL
Java_com_telandi_recorder_ndi_NdiNative_nativeSendVideo(JNIEnv* env, jobject, jlong handle,
                                                        jobject buffer, jint width, jint height,
                                                        jint stride, jint fpsN, jint fpsD) {
    auto* sender = reinterpret_cast<Sender*>(handle);
    if (!sender || width <= 0 || height <= 0) return;
    auto* data = static_cast<uint8_t*>(env->GetDirectBufferAddress(buffer));
    if (!data) return;
    NdiVideoFrameV2 frame{};
    frame.xres = width;
    frame.yres = height;
    frame.FourCC = kFourCC_RGBX;
    frame.frame_rate_N = fpsN;
    frame.frame_rate_D = fpsD;
    frame.picture_aspect_ratio = static_cast<float>(width) / static_cast<float>(height);
    frame.frame_format_type = kFrameFormatProgressive;
    frame.timecode = kTimecodeSynthesize;
    frame.p_data = data;
    frame.line_stride_in_bytes = stride;
    frame.p_metadata = nullptr;
    frame.timestamp = 0;
    g_api.send_video_v2(sender->instance, &frame);
}

JNIEXPORT void JNICALL
Java_com_telandi_recorder_ndi_NdiNative_nativeSendAudio(JNIEnv* env, jobject, jlong handle,
                                                        jshortArray pcm, jint frames,
                                                        jint channels, jint sampleRate) {
    auto* sender = reinterpret_cast<Sender*>(handle);
    if (!sender || frames <= 0 || channels <= 0) return;
    if (env->GetArrayLength(pcm) < frames * channels) return;
    sender->planar.resize(static_cast<size_t>(frames) * channels);
    auto* src = static_cast<jshort*>(env->GetPrimitiveArrayCritical(pcm, nullptr));
    if (!src) return;
    for (int ch = 0; ch < channels; ++ch) {
        float* dst = sender->planar.data() + static_cast<size_t>(ch) * frames;
        for (int i = 0; i < frames; ++i) {
            dst[i] = static_cast<float>(src[i * channels + ch]) / 32768.0f;
        }
    }
    env->ReleasePrimitiveArrayCritical(pcm, src, JNI_ABORT);

    NdiAudioFrameV2 audio{};
    audio.sample_rate = sampleRate;
    audio.no_channels = channels;
    audio.no_samples = frames;
    audio.timecode = kTimecodeSynthesize;
    audio.p_data = sender->planar.data();
    audio.channel_stride_in_bytes = frames * static_cast<int>(sizeof(float));
    audio.p_metadata = nullptr;
    audio.timestamp = 0;
    g_api.send_audio_v2(sender->instance, &audio);
}

JNIEXPORT jint JNICALL
Java_com_telandi_recorder_ndi_NdiNative_nativeConnections(JNIEnv*, jobject, jlong handle) {
    auto* sender = reinterpret_cast<Sender*>(handle);
    if (!sender) return 0;
    return g_api.get_no_connections(sender->instance, 0);
}

}  // extern "C"
