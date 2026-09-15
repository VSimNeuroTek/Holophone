package com.mudva.lumen;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceStatsPlugin.class);
        registerPlugin(VoiceCapturePlugin.class);
        registerPlugin(SecureStorePlugin.class);
        registerPlugin(AudioRoutePlugin.class);

        super.onCreate(savedInstanceState);

        protectRecentsPreview();
        getWindow().getDecorView().post(this::applyImmersiveMode);
    }

    @Override
    public void onResume() {
        super.onResume();
        getWindow().getDecorView().post(this::applyImmersiveMode);
    }

    @Override
    protected void onPostResume() {
        super.onPostResume();
        getWindow().getDecorView().post(this::applyImmersiveMode);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().post(this::applyImmersiveMode);
        }
    }

    private void protectRecentsPreview() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            setRecentsScreenshotEnabled(false);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
    }

    private void applyImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams attrs = getWindow().getAttributes();
            attrs.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attrs);
        }

        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller == null) {
            return;
        }

        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
