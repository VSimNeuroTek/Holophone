package com.mudva.lumen;

import android.os.Build;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PrivacyControl")
public class PrivacyControlPlugin extends Plugin {

    private volatile boolean previewVisible = false;

    @PluginMethod
    public void setRecentsPreview(PluginCall call) {
        final boolean visible = call.getBoolean("visible", false);
        getActivity().runOnUiThread(() -> {
            try {
                applyRecentsPreview(visible);
                previewVisible = visible;
                JSObject out = new JSObject();
                out.put("visible", visible);
                out.put("api", Build.VERSION.SDK_INT);
                call.resolve(out);
            } catch (Exception ex) {
                call.reject("Impossible de modifier l'aperçu Android : " + ex.getMessage(), ex);
            }
        });
    }

    @PluginMethod
    public void getRecentsPreview(PluginCall call) {
        JSObject out = new JSObject();
        out.put("visible", previewVisible);
        out.put("api", Build.VERSION.SDK_INT);
        call.resolve(out);
    }

    public void applyRecentsPreview(boolean visible) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getActivity().setRecentsScreenshotEnabled(visible);
        } else if (visible) {
            getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        } else {
            getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
    }
}
