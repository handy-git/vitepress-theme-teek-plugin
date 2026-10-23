package cn.handyplus.teek.markdown.settings;

import com.intellij.openapi.options.Configurable;
import org.jetbrains.annotations.Nullable;

import javax.swing.JCheckBox;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;

/**
 * Teek 预览插件设置界面。
 *
 * @author handy
 */
public final class TeekConfigurable implements Configurable {

    private JCheckBox enabledBox;

    private JTextField publicDirField;

    @Override
    public String getDisplayName() {
        return "Teek Markdown";
    }

    /**
     * 创建设置面板。
     *
     * @return 设置面板
     */
    @Nullable
    @Override
    public JComponent createComponent() {
        JPanel panel = new JPanel(new GridBagLayout());
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.insets = new Insets(4, 4, 4, 4);
        constraints.anchor = GridBagConstraints.WEST;

        enabledBox = new JCheckBox("启用 Teek 容器与图片路径解析");
        constraints.gridx = 0;
        constraints.gridy = 0;
        constraints.gridwidth = 2;
        panel.add(enabledBox, constraints);

        constraints.gridwidth = 1;
        constraints.gridy = 1;
        panel.add(new JLabel("public 目录（相对项目，留空自动查找）:"), constraints);

        publicDirField = new JTextField(28);
        constraints.gridx = 1;
        panel.add(publicDirField, constraints);

        constraints.gridx = 0;
        constraints.gridy = 2;
        constraints.gridwidth = 2;
        panel.add(new JLabel("例如 docs/public；留空时从 md 文件向上查找 public 与 docs/public"), constraints);

        return panel;
    }

    @Override
    public boolean isModified() {
        TeekSettings settings = TeekSettings.getInstance();
        return enabledBox.isSelected() != settings.isEnabled()
                || !publicDirField.getText().trim().equals(settings.getPublicDir());
    }

    @Override
    public void apply() {
        TeekSettings settings = TeekSettings.getInstance();
        settings.setEnabled(enabledBox.isSelected());
        settings.setPublicDir(publicDirField.getText().trim());
    }

    @Override
    public void reset() {
        TeekSettings settings = TeekSettings.getInstance();
        enabledBox.setSelected(settings.isEnabled());
        publicDirField.setText(settings.getPublicDir());
    }
}
