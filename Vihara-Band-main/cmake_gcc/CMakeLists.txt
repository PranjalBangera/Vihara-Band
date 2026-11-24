# Define minimal required version of CMake.
cmake_minimum_required(VERSION "3.25")

# Project definition
project(
	VIHARA_BAND
	VERSION 1.0
	LANGUAGES C CXX ASM
)

# Include the definition of the slc_VIHARA_BAND target,
# which contains the content of the SLC project
include("${CMAKE_CURRENT_LIST_DIR}/VIHARA_BAND.cmake")

add_compile_definitions(SL_CATALOG_GATT_CONFIGURATION_PRESENT)

add_executable(VIHARA_BAND
    # Sources are compiled via the slc cmake target (VIHARA_BAND.cmake)
    # Do NOT add app_ble.c / app.c here - they are already in the slc target
)

target_include_directories(VIHARA_BAND PUBLIC
    ..
)

target_compile_definitions(VIHARA_BAND PUBLIC
    # Add additional macros here
)

target_compile_options(VIHARA_BAND PUBLIC
    # Set additional compiler flags here
)

target_link_options(VIHARA_BAND PUBLIC
    # Set additional linker flags here
)

# Link with the content defined in the SLC project
target_link_libraries(VIHARA_BAND PRIVATE
    slc
)

# Include managed project content if available
include(VIHARA_BAND_project.cmake OPTIONAL RESULT_VARIABLE managed_project)
if(managed_project)
    message(STATUS "Using managed project content from ${managed_project}")
endif()

# Force the gcc linker command
set_target_properties(VIHARA_BAND PROPERTIES LINKER_LANGUAGE C)

# Create .bin, .hex and .s37 artifacts after building the project
add_custom_command(TARGET VIHARA_BAND
    POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} ${OBJCOPY_SREC_CMD} "$<TARGET_FILE:VIHARA_BAND>" "$<TARGET_FILE_DIR:VIHARA_BAND>/$<TARGET_FILE_BASE_NAME:VIHARA_BAND>.s37"
    COMMAND ${CMAKE_OBJCOPY} ${OBJCOPY_IHEX_CMD} "$<TARGET_FILE:VIHARA_BAND>" "$<TARGET_FILE_DIR:VIHARA_BAND>/$<TARGET_FILE_BASE_NAME:VIHARA_BAND>.hex"
    COMMAND ${CMAKE_OBJCOPY} ${OBJCOPY_BIN_CMD}  "$<TARGET_FILE:VIHARA_BAND>" "$<TARGET_FILE_DIR:VIHARA_BAND>/$<TARGET_FILE_BASE_NAME:VIHARA_BAND>.bin" 
)

# Run post-build pipeline to perform additional post-processing
if(post_build_command)
add_custom_command(TARGET VIHARA_BAND
    POST_BUILD
    WORKING_DIRECTORY ${CMAKE_CURRENT_LIST_DIR}/..
    COMMAND ${post_build_command}
)
endif()