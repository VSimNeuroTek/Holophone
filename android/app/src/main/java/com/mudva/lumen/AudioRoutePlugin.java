package com.mudva.lumen;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {

    private AudioManager audioManager() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    private String kind(AudioDeviceInfo device) {
        switch (device.getType()) {
            case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER:
                return "speaker";
            case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE:
                return "earpiece";
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO:
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP:
                return "bluetooth";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET:
            case AudioDeviceInfo.TYPE_WIRED_HEADPHONES:
                return "wired";
            case AudioDeviceInfo.TYPE_USB_HEADSET:
            case AudioDeviceInfo.TYPE_USB_DEVICE:
                return "usb";
            default:
                return "other";
        }
    }

    private String label(AudioDeviceInfo device) {
        CharSequence product = device.getProductName();
        String name = product == null ? "" : product.toString().trim();
        if (!name.isEmpty()) {
            return name;
        }
        String kind = kind(device);
        if ("speaker".equals(kind)) return "Haut-parleur";
        if ("earpiece".equals(kind)) return "Écouteur";
        if ("bluetooth".equals(kind)) return "Bluetooth";
        if ("wired".equals(kind)) return "Casque filaire";
        if ("usb".equals(kind)) return "USB";
        return "Sortie audio";
    }

    @PluginMethod
    public void listRoutes(PluginCall call) {
        JSArray routes = new JSArray();
        AudioManager manager = audioManager();

        if (manager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            List<AudioDeviceInfo> devices = manager.getAvailableCommunicationDevices();
            for (AudioDeviceInfo device : devices) {
                JSObject item = new JSObject();
                item.put("id", String.valueOf(device.getId()));
                item.put("kind", kind(device));
                item.put("label", label(device));
                routes.put(item);
            }
        }

        if (routes.length() == 0) {
            JSObject speaker = new JSObject();
            speaker.put("id", "speaker");
            speaker.put("kind", "speaker");
            speaker.put("label", "Haut-parleur");
            routes.put(speaker);

            JSObject earpiece = new JSObject();
            earpiece.put("id", "earpiece");
            earpiece.put("kind", "earpiece");
            earpiece.put("label", "Écouteur");
            routes.put(earpiece);
        }

        JSObject result = new JSObject();
        result.put("routes", routes);
        call.resolve(result);
    }

    @PluginMethod
    public void setRoute(PluginCall call) {
        AudioManager manager = audioManager();
        if (manager == null) {
            call.reject("AudioManager indisponible");
            return;
        }

        String requested = call.getString("route", "speaker");
        manager.setMode(AudioManager.MODE_IN_COMMUNICATION);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if ("default".equals(requested)) {
                    manager.clearCommunicationDevice();
                    call.resolve();
                    return;
                }

                List<AudioDeviceInfo> devices = manager.getAvailableCommunicationDevices();
                AudioDeviceInfo selected = null;

                for (AudioDeviceInfo device : devices) {
                    if (String.valueOf(device.getId()).equals(requested)) {
                        selected = device;
                        break;
                    }
                }

                if (selected == null) {
                    for (AudioDeviceInfo device : devices) {
                        if (kind(device).equals(requested)) {
                            selected = device;
                            break;
                        }
                    }
                }

                if (selected == null || !manager.setCommunicationDevice(selected)) {
                    call.reject("Sortie audio non disponible : " + requested);
                    return;
                }

                JSObject result = new JSObject();
                result.put("route", kind(selected));
                result.put("id", selected.getId());
                call.resolve(result);
                return;
            }

            if ("speaker".equals(requested)) {
                manager.setSpeakerphoneOn(true);
            } else {
                manager.setSpeakerphoneOn(false);
            }
            call.resolve();
        } catch (Exception ex) {
            call.reject("Routage audio impossible : " + ex.getMessage(), ex);
        }
    }

    @PluginMethod
    public void resetRoute(PluginCall call) {
        AudioManager manager = audioManager();
        if (manager != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    manager.clearCommunicationDevice();
                } else {
                    manager.setSpeakerphoneOn(false);
                }
                manager.setMode(AudioManager.MODE_NORMAL);
            } catch (Exception ignored) {
            }
        }
        call.resolve();
    }
}
