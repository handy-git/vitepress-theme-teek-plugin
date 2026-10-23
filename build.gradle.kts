plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.19.0"
}

group = "cn.handyplus"
version = "0.1.0"

java {
    toolchain {
        // 2026.2 平台类文件版本 69，必须用 JDK 25 编译
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        // 本机已装 IDEA 2026.2.3（build 262），直接复用安装目录，免下载
        local("/Applications/IntelliJ IDEA.app")
        // 若想按版本自动下载，可改用：intellijIdeaUltimate("2026.2.3")
        bundledPlugin("org.intellij.plugins.markdown")
    }
}

intellijPlatform {
    pluginConfiguration {
        id = "cn.handyplus.teek.markdown"
        name = "Teek Markdown Preview"
        version = project.version.toString()

        ideaVersion {
            sinceBuild = "262"
        }
    }
}

tasks {
    compileJava {
        options.encoding = "UTF-8"
    }
}
