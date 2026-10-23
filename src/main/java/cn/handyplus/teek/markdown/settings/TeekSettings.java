package cn.handyplus.teek.markdown.settings;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.PersistentStateComponent;
import com.intellij.openapi.components.State;
import com.intellij.openapi.components.Storage;
import org.jetbrains.annotations.NotNull;

/**
 * Teek 预览插件配置。
 *
 * @author handy
 */
@State(name = "TeekMarkdownSettings", storages = @Storage("teek-markdown.xml"))
public final class TeekSettings implements PersistentStateComponent<TeekSettings.State> {

    private State state = new State();

    /**
     * 获取全局配置实例。
     *
     * @return 配置实例
     */
    @NotNull
    public static TeekSettings getInstance() {
        return ApplicationManager.getApplication().getService(TeekSettings.class);
    }

    @NotNull
    @Override
    public State getState() {
        return state;
    }

    @Override
    public void loadState(@NotNull State state) {
        this.state = state;
    }

    /**
     * 是否启用 Teek 语法渲染。
     *
     * @return 是否启用
     */
    public boolean isEnabled() {
        return state.enabled;
    }

    public void setEnabled(boolean enabled) {
        state.enabled = enabled;
    }

    /**
     * 配置的 public 目录，相对任意上级目录，为空表示自动查找。
     *
     * @return public 目录
     */
    @NotNull
    public String getPublicDir() {
        return state.publicDir == null ? "" : state.publicDir;
    }

    public void setPublicDir(@NotNull String publicDir) {
        state.publicDir = publicDir;
    }

    /**
     * 持久化结构。
     */
    public static final class State {

        /**
         * 是否启用 Teek 语法渲染
         */
        public boolean enabled = true;

        /**
         * public 目录，相对项目路径，为空时自动查找
         */
        public String publicDir = "";
    }
}
