package cn.handyplus.teek.markdown.preview;

import cn.handyplus.teek.markdown.settings.TeekSettings;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.vfs.VirtualFile;
import org.intellij.plugins.markdown.extensions.MarkdownBrowserPreviewExtension;
import org.intellij.plugins.markdown.ui.preview.MarkdownHtmlPanel;
import org.intellij.plugins.markdown.ui.preview.ResourceProvider;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Teek 预览扩展：向预览页注入脚本与样式，并接管图片资源加载。
 * <p>
 * 脚本负责把 {@code ::: type} 容器改写成真实的 DOM；资源加载负责把以 {@code /} 开头的
 * 路径映射到 VitePress 的 public 目录，以及提供插件自带的 js/css。
 *
 * @author handy
 */
public final class TeekPreviewExtension implements MarkdownBrowserPreviewExtension, ResourceProvider {

    private static final Logger LOG = Logger.getInstance(TeekPreviewExtension.class);

    /**
     * 插件自带资源前缀，与 {@code src/main/resources/teek} 目录对应
     */
    private static final String BUNDLED_PREFIX = "teek/";

    /**
     * 脚本中拼接的图片资源前缀，避免与 markdown 原生图片路径混淆
     */
    private static final String ASSET_PREFIX = "teek/asset/";

    /**
     * 动态生成的路径映射脚本名
     */
    private static final String DATA_SCRIPT = "teek/data.js";

    /**
     * markdown 图片引用与 HTML img 标签
     */
    private static final Pattern IMAGE_REF = Pattern.compile(
        "!\\[[^\\]]*\\]\\(([^)\\s]+)[^)]*\\)|<img[^>]+src=[\"']([^\"']+)[\"']|(?:img|avatar)\\s*:\\s*([^\\s#\"']+)",
        Pattern.CASE_INSENSITIVE);

    private static final List<String> SCRIPTS = List.of("teek/data.js", "teek/teek.js");

    private static final List<String> STYLES = List.of("teek/teek.css");

    /**
     * 向上查找 public 目录的最大层级
     */
    private static final int MAX_UP_LEVELS = 8;

    private final MarkdownHtmlPanel panel;

    private VirtualFile publicDir;

    private boolean publicDirResolved;

    /**
     * 构造 Teek 预览扩展。
     *
     * @param panel 预览面板
     */
    public TeekPreviewExtension(@NotNull MarkdownHtmlPanel panel) {
        this.panel = panel;
    }

    /**
     * 注入到预览页的脚本。
     *
     * @return 脚本资源路径
     */
    @NotNull
    @Override
    public List<String> getScripts() {
        return SCRIPTS;
    }

    /**
     * 注入到预览页的样式。
     *
     * @return 样式资源路径
     */
    @NotNull
    @Override
    public List<String> getStyles() {
        return STYLES;
    }

    /**
     * 必须最先接管资源加载。
     * <p>
     * IDE 的资源聚合器是「首个 canProvide 为 true 的提供者直接命中，其返回 null 也不会再问下一个」，
     * 而内置的图片扩展只按扩展名判断（.webp/.png 一律 true）并排在后面。
     * 若我们排在它之后，图片请求会被它截胡并以 null 结束，预览里就是破图。
     *
     * @return 优先级
     */
    @NotNull
    @Override
    public Priority getPriority() {
        return Priority.BEFORE_ALL;
    }

    /**
     * 同时作为资源提供者，负责图片与自带资源。
     *
     * @return 自身实例
     */
    @Nullable
    @Override
    public ResourceProvider getResourceProvider() {
        return this;
    }

    @Override
    public void dispose() {
        // 无需释放资源，面板销毁即结束
    }

    /**
     * 判断资源是否由本扩展提供。
     *
     * @param resourceName 资源名，如 {@code teek/teek.js}、{@code /blog/a.png}
     * @return 是否可提供
     */
    @Override
    public boolean canProvide(@NotNull String resourceName) {
        if (!TeekSettings.getInstance().isEnabled()) {
            return false;
        }
        if (resourceName.startsWith(BUNDLED_PREFIX)) {
            return true;
        }
        if (resourceName.startsWith("/")) {
            // 只接管 public 目录里真实存在的文件，避免截胡其它扩展的资源
            return findPublicFile(resourceName) != null;
        }
        return false;
    }

    /**
     * 加载资源内容。
     *
     * @param resourceName 资源名
     * @return 资源内容，找不到时返回 {@code null} 交由其他扩展处理
     */
    @Nullable
    @Override
    public Resource loadResource(@NotNull String resourceName) {
        try {
            if (DATA_SCRIPT.equals(resourceName)) {
                return buildDataScript();
            }
            if (resourceName.startsWith(ASSET_PREFIX)) {
                String path = resourceName.substring(ASSET_PREFIX.length());
                Resource resource = loadPublicFile(path);
                if (resource == null) {
                    // 相对路径图片（./a.png、../img/a.png）回退到 md 所在目录查找
                    resource = loadMarkdownRelative(path);
                }
                if (resource == null) {
                    LOG.info("Teek: 未找到资源 " + path + "（public 目录 " + describePublicDir() + "）");
                } else {
                    LOG.info("Teek: 返回资源 " + path + "（" + resource.getContent().length + " bytes）");
                }
                return resource;
            }
            if (resourceName.startsWith(BUNDLED_PREFIX)) {
                return loadBundledResource(resourceName);
            }
            if (resourceName.startsWith("/")) {
                return loadPublicFile(resourceName);
            }
            return null;
        } catch (IOException e) {
            LOG.warn("加载 Teek 预览资源失败：" + resourceName, e);
            return null;
        }
    }

    /**
     * 生成路径映射脚本，把 public 目录与 md 目录暴露给预览页，
     * 让图片可以走 file:// 直读（CSP 的 img-src file: 是 IDE 明确允许的）。
     *
     * @return 脚本内容
     */
    @NotNull
    private Resource buildDataScript() {
        VirtualFile markdownFile = panel.getVirtualFile();
        VirtualFile mdDir = markdownFile == null ? null : markdownFile.getParent();
        VirtualFile publicDir = getPublicDir();
        String resources = markdownFile == null ? "{}" : buildResourceMap(markdownFile);
        String script = "window.__TEEK_PATHS__={"
            + "\"publicDir\":" + jsonString(publicDir == null ? "" : publicDir.getPath())
            + ",\"mdDir\":" + jsonString(mdDir == null ? "" : mdDir.getPath())
            + ",\"resources\":" + resources
            + "};";
        return new Resource(script.getBytes(StandardCharsets.UTF_8), "text/javascript; charset=UTF-8");
    }

    /**
     * 扫描文档里的图片引用，把「引用名 → 真实绝对路径」解析成映射表下发给预览页。
     * <p>
     * 只放真实存在的文件，JS 侧命中才改写地址，避免拼错路径造成破图。
     *
     * @param markdownFile 当前 markdown 文件
     * @return JSON 对象字符串
     */
    @NotNull
    private String buildResourceMap(@NotNull VirtualFile markdownFile) {
        String text;
        try {
            text = new String(markdownFile.contentsToByteArray(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            LOG.warn("读取 markdown 失败：" + markdownFile.getPath(), e);
            return "{}";
        }
        Matcher matcher = IMAGE_REF.matcher(text);
        StringBuilder json = new StringBuilder("{");
        boolean first = true;
        while (matcher.find()) {
            String raw = firstNonNull(matcher.group(1), matcher.group(2), matcher.group(3));
            if (raw == null || raw.isEmpty() || raw.matches("^(?i)(https?:|data:|file:|//).*")) {
                continue;
            }
            String key = normalizeKey(raw);
            if (json.indexOf(jsonString(key)) >= 0) {
                continue;
            }
            VirtualFile file = resolveImage(raw);
            if (file == null) {
                continue;
            }
            if (!first) {
                json.append(",");
            }
            json.append(jsonString(key)).append(":").append(jsonString(file.getPath()));
            first = false;
        }
        return json.append("}").toString();
    }

    /**
     * 取第一个非空值。
     *
     * @param values 候选值
     * @return 第一个非空值，全空返回 {@code null}
     */
    @Nullable
    private static String firstNonNull(@Nullable String... values) {
        for (String value : values) {
            if (value != null && !value.isEmpty()) {
                return value;
            }
        }
        return null;
    }

    /**
     * 解析图片引用对应的真实文件。
     *
     * @param raw 文档里的原始引用
     * @return 文件，不存在返回 {@code null}
     */
    @Nullable
    private VirtualFile resolveImage(@NotNull String raw) {
        String path = raw.split("[?#]")[0];
        if (path.isEmpty()) {
            return null;
        }
        if (path.startsWith("/")) {
            VirtualFile publicDir = getPublicDir();
            return publicDir == null ? null : asFile(publicDir, path.replaceAll("^/+", ""));
        }
        VirtualFile markdownFile = panel.getVirtualFile();
        VirtualFile mdDir = markdownFile == null ? null : markdownFile.getParent();
        if (mdDir != null) {
            VirtualFile file = asFile(mdDir, path);
            if (file != null) {
                return file;
            }
        }
        VirtualFile publicDir = getPublicDir();
        return publicDir == null ? null : asFile(publicDir, path.replaceAll("^(\\./)+", ""));
    }

    /**
     * 按相对路径取文件，目录与不存在都返回 {@code null}。
     *
     * @param dir  基准目录
     * @param path 相对路径
     * @return 文件
     */
    @Nullable
    private static VirtualFile asFile(@NotNull VirtualFile dir, @NotNull String path) {
        VirtualFile file = dir.findFileByRelativePath(path);
        return file == null || file.isDirectory() ? null : file;
    }

    /**
     * 把引用名归一化成映射表的 key，与前端 assetName 的规则保持一致。
     *
     * @param raw 原始引用
     * @return 归一化名字
     */
    @NotNull
    private static String normalizeKey(@NotNull String raw) {
        return raw.split("[?#]")[0].replaceAll("^(\\./)+", "").replaceAll("^/+", "");
    }

    /**
     * 把字符串转成 JSON 字符串字面量。
     *
     * @param value 原始值
     * @return JSON 字符串
     */
    @NotNull
    private static String jsonString(@NotNull String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    /**
     * public 目录路径描述，用于日志。
     *
     * @return 目录路径或「未找到」
     */
    @NotNull
    private String describePublicDir() {
        VirtualFile dir = getPublicDir();
        return dir == null ? "未找到" : dir.getPath();
    }

    /**
     * 以 markdown 文件所在目录为基准加载资源。
     *
     * @param path 相对路径
     * @return 资源内容，找不到返回 {@code null}
     * @throws IOException 读取失败
     */
    @Nullable
    private Resource loadMarkdownRelative(@NotNull String path) throws IOException {
        VirtualFile markdownFile = panel.getVirtualFile();
        VirtualFile parent = markdownFile == null ? null : markdownFile.getParent();
        if (parent == null) {
            return null;
        }
        VirtualFile file = parent.findFileByRelativePath(path);
        if (file == null || file.isDirectory()) {
            return null;
        }
        return new Resource(file.contentsToByteArray(), contentType(file.getName()));
    }

    /**
     * 加载插件 jar 内的资源。
     *
     * @param resourceName 资源名
     * @return 资源内容
     * @throws IOException 读取失败
     */
    @Nullable
    private Resource loadBundledResource(@NotNull String resourceName) throws IOException {
        try (InputStream stream = TeekPreviewExtension.class.getResourceAsStream("/" + resourceName)) {
            if (stream == null) {
                return null;
            }
            return new Resource(stream.readAllBytes(), contentType(resourceName));
        }
    }

    /**
     * 加载 public 目录下的文件。
     *
     * @param path 以 {@code /} 开头或相对于 public 目录的路径
     * @return 资源内容
     * @throws IOException 读取失败
     */
    @Nullable
    private Resource loadPublicFile(@NotNull String path) throws IOException {
        VirtualFile file = findPublicFile(path);
        if (file == null) {
            return null;
        }
        return new Resource(file.contentsToByteArray(), contentType(file.getName()));
    }

    /**
     * 在 public 目录里按相对路径找文件。
     *
     * @param path 相对 public 目录的路径
     * @return 文件，不存在返回 {@code null}
     */
    @Nullable
    private VirtualFile findPublicFile(@NotNull String path) {
        VirtualFile dir = getPublicDir();
        if (dir == null) {
            return null;
        }
        String relative = path.replaceAll("^/+", "");
        VirtualFile file = dir.findFileByRelativePath(relative);
        if (file == null) {
            // 静态服务器可能未解码 URL，兜底再试一次
            file = dir.findFileByRelativePath(URLDecoder.decode(relative, StandardCharsets.UTF_8));
        }
        return file == null || file.isDirectory() ? null : file;
    }

    /**
     * 定位当前文档对应的 public 目录，结果缓存到面板销毁。
     *
     * @return public 目录，找不到返回 {@code null}
     */
    @Nullable
    private VirtualFile getPublicDir() {
        if (!publicDirResolved) {
            publicDir = resolvePublicDir();
            publicDirResolved = true;
            LOG.info("Teek: public 目录 = " + (publicDir == null ? "未找到" : publicDir.getPath()));
        }
        return publicDir;
    }

    /**
     * 从当前 md 文件向上查找 public 目录。
     * <p>
     * 配置了相对路径时优先按配置查找，否则依次判断同级 {@code public} 与 {@code docs/public}。
     *
     * @return public 目录
     */
    @Nullable
    private VirtualFile resolvePublicDir() {
        VirtualFile markdownFile = panel.getVirtualFile();
        if (markdownFile == null) {
            return null;
        }
        String configured = TeekSettings.getInstance().getPublicDir().trim();

        VirtualFile dir = markdownFile.getParent();
        for (int level = 0; level < MAX_UP_LEVELS && dir != null; level++) {
            if (!configured.isEmpty()) {
                VirtualFile hit = dir.findFileByRelativePath(configured);
                if (hit != null && hit.isDirectory()) {
                    return hit;
                }
            } else {
                VirtualFile pub = dir.findChild("public");
                if (pub != null && pub.isDirectory()) {
                    return pub;
                }
                VirtualFile docs = dir.findChild("docs");
                VirtualFile docsPub = docs == null ? null : docs.findChild("public");
                if (docsPub != null && docsPub.isDirectory()) {
                    return docsPub;
                }
            }
            dir = dir.getParent();
        }
        return null;
    }

    /**
     * 按扩展名推断 Content-Type。
     *
     * @param name 文件名或路径
     * @return Content-Type
     */
    @NotNull
    private static String contentType(@NotNull String name) {
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        int dot = name.lastIndexOf('.');
        String extension = dot > slash ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        switch (extension) {
            case "js":
                return "text/javascript; charset=UTF-8";
            case "css":
                return "text/css; charset=UTF-8";
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "gif":
                return "image/gif";
            case "webp":
                return "image/webp";
            case "svg":
                return "image/svg+xml";
            case "bmp":
                return "image/bmp";
            case "ico":
                return "image/x-icon";
            case "avif":
                return "image/avif";
            default:
                return "application/octet-stream";
        }
    }
}
