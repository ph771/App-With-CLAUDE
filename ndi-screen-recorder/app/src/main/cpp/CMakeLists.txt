cmake_minimum_required(VERSION 3.22.1)
project(ndibridge CXX)

# Ponte JNI fina que carrega a biblioteca oficial libndi.so em tempo de execução (dlopen).
# Assim o app compila mesmo sem o SDK NDI; se libndi.so estiver no APK, o NDI funciona.
add_library(ndibridge SHARED ndi_bridge.cpp)
find_library(log-lib log)
target_link_libraries(ndibridge ${log-lib} dl)
