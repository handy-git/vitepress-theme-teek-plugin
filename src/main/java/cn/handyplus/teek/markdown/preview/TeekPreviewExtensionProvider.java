package cn.handyplus.teek.markdown.preview;

import com.intellij.openapi.diagnostic.Logger;
import org.intellij.plugins.markdown.extensions.MarkdownBrowserPreviewExtension;
import org.intellij.plugins.markdown.ui.preview.MarkdownHtmlPanel;
import org.jetbrains.annotations.NotNull;

/**
 * Teek 预览扩展的注册入口。
 * <p>
 * 由 markdown 插件的 {@code browserPreviewExtensionProvider} 扩展点调用，
 * 每个预览面板创建一次，生命周期由面板负责回收。
 *
 * @author handy
 */
public final class TeekPreviewExtensionProvider implements MarkdownBrowserPreviewExtension.Provider {

    private static final Logger LOG = Logger.getInstance(TeekPreviewExtensionProvider.class);

    /**
     * 为指定预览面板创建扩展实例。
     *
     * @param panel 预览面板
     * @return Teek 预览扩展
     */
    @NotNull
    @Override
    public MarkdownBrowserPreviewExtension createBrowserExtension(@NotNull MarkdownHtmlPanel panel) {
        LOG.info("Teek: 预览扩展已挂载，文件 = " + panel.getVirtualFile());
        return new TeekPreviewExtension(panel);
    }
}
