package cn.handyplus.teek.markdown;

import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.startup.ProjectActivity;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import org.intellij.plugins.markdown.settings.MarkdownSettings;
import org.intellij.plugins.markdown.ui.preview.MarkdownHtmlPanelProvider;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * 项目启动后校正 Markdown 预览渲染器。
 * <p>
 * 2026.2 起 Markdown 预览支持 Compose 渲染器（registry
 * {@code enable.markdown.compose.preview.renderer.choice} 默认开启），但 Compose 面板不加载
 * {@code browserPreviewExtensionProvider} 注入的脚本，Teek 容器会原样输出。这里在项目打开时
 * 把渲染器固定为 JCEF，避免用户手动改设置。
 *
 * @author handy
 */
public final class TeekStartupActivity implements ProjectActivity {

    private static final Logger LOG = Logger.getInstance(TeekStartupActivity.class);

    /**
     * Compose 预览面板提供者
     */
    private static final String COMPOSE_PROVIDER_CLASS = "com.intellij.markdown.compose.preview.ComposePanelProvider";

    /**
     * JCEF 预览面板提供者
     */
    private static final String JCEF_PROVIDER_CLASS = "com.intellij.markdown.jcef.preview.JCEFHtmlPanelProvider";

    /**
     * 项目打开后检查并切换渲染器。
     *
     * @param project      当前项目
     * @param continuation 协程续体
     * @return Unit
     */
    @Nullable
    @Override
    public Object execute(@NotNull Project project, @NotNull Continuation<? super Unit> continuation) {
        ensureJcefRenderer(project);
        return Unit.INSTANCE;
    }

    /**
     * 当前渲染器为空或为 Compose 时，切换为 JCEF。
     *
     * @param project 当前项目
     */
    private static void ensureJcefRenderer(@NotNull Project project) {
        MarkdownSettings settings = MarkdownSettings.getInstance(project);
        MarkdownHtmlPanelProvider.ProviderInfo current = settings.getPreviewPanelProviderInfo();
        if (current != null && !COMPOSE_PROVIDER_CLASS.equals(current.getClassName())) {
            return;
        }
        MarkdownHtmlPanelProvider.ProviderInfo jcef = findProvider(JCEF_PROVIDER_CLASS);
        if (jcef == null || jcef.equals(current)) {
            return;
        }
        settings.setPreviewPanelProviderInfo(jcef);
        LOG.info("Teek: Markdown 预览渲染器已切换为 JCEF，Compose 预览不支持脚本注入");
    }

    /**
     * 按类名查找预览面板提供者信息。
     *
     * @param className 提供者类名
     * @return 提供者信息，未注册时返回 {@code null}
     */
    @Nullable
    private static MarkdownHtmlPanelProvider.ProviderInfo findProvider(@NotNull String className) {
        for (MarkdownHtmlPanelProvider provider : MarkdownHtmlPanelProvider.getProviders()) {
            MarkdownHtmlPanelProvider.ProviderInfo info = provider.getProviderInfo();
            if (className.equals(info.getClassName())) {
                return info;
            }
        }
        return null;
    }
}
