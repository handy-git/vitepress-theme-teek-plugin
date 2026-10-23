plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.19.0"
}

group = "cn.handyplus"
version = "0.1.0"

java {
    toolchain {
        // 2026.2 平台类文件版本为 69，必须使用 JDK 25 编译
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
        // 离线构建：把 LOCAL_IDE_PATH 指向本机已安装的 IDE，例如
        // LOCAL_IDE_PATH="/Applications/IntelliJ IDEA.app" ./gradlew buildPlugin
        // 未设置该变量时按版本号下载对应 IDE
        val localIde = providers.environmentVariable("LOCAL_IDE_PATH").orNull
        if (localIde != null) {
            local(localIde)
        } else {
            intellijIdeaUltimate("2026.2.3")
        }
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

    // Marketplace 签名：设置下列三个环境变量后执行 ./gradlew signPlugin
    signing {
        certificateChain = providers.environmentVariable("CERTIFICATE_CHAIN")
        privateKey = providers.environmentVariable("PRIVATE_KEY")
        password = providers.environmentVariable("PRIVATE_KEY_PASSWORD")
    }
}

tasks {
    compileJava {
        options.encoding = "UTF-8"
    }
}
