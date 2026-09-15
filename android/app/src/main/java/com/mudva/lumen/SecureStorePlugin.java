package com.mudva.lumen;

import android.hardware.biometrics.BiometricPrompt;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.CancellationSignal;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureStore")
public class SecureStorePlugin extends Plugin {

    private static final String KEY_ALIAS = "HolophoneSecureKeyV2";
    private static final String PREFS = "holophone_secure_v2";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private SecretKey secretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        if (!keyStore.containsAlias(KEY_ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_AES,
                    ANDROID_KEYSTORE
            );
            KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .build();
            generator.init(spec);
            generator.generateKey();
        }

        return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
    }

    private String encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey());

        byte[] iv = cipher.getIV();
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));

        ByteBuffer packet = ByteBuffer.allocate(4 + iv.length + encrypted.length);
        packet.putInt(iv.length);
        packet.put(iv);
        packet.put(encrypted);

        return Base64.encodeToString(packet.array(), Base64.NO_WRAP);
    }

    private String decrypt(String encoded) throws Exception {
        byte[] packet = Base64.decode(encoded, Base64.NO_WRAP);
        ByteBuffer buffer = ByteBuffer.wrap(packet);
        int ivLength = buffer.getInt();
        if (ivLength < 8 || ivLength > 32 || buffer.remaining() <= ivLength) {
            throw new IllegalArgumentException("Donnée sécurisée invalide");
        }

        byte[] iv = new byte[ivLength];
        buffer.get(iv);
        byte[] encrypted = new byte[buffer.remaining()];
        buffer.get(encrypted);

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(128, iv));
        byte[] plain = cipher.doFinal(encrypted);
        return new String(plain, StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void setSecret(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value", "");
        if (key == null || key.trim().isEmpty()) {
            call.reject("Clé de stockage absente");
            return;
        }

        try {
            prefs().edit().putString(key, encrypt(value)).apply();
            call.resolve();
        } catch (Exception ex) {
            call.reject("Écriture sécurisée impossible : " + ex.getMessage(), ex);
        }
    }

    @PluginMethod
    public void getSecret(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.trim().isEmpty()) {
            call.reject("Clé de stockage absente");
            return;
        }

        JSObject result = new JSObject();
        String stored = prefs().getString(key, null);
        if (stored == null) {
            result.put("found", false);
            result.put("value", "");
            call.resolve(result);
            return;
        }

        try {
            result.put("found", true);
            result.put("value", decrypt(stored));
            call.resolve(result);
        } catch (Exception ex) {
            call.reject("Lecture sécurisée impossible : " + ex.getMessage(), ex);
        }
    }

    @PluginMethod
    public void removeSecret(PluginCall call) {
        String key = call.getString("key");
        if (key != null) {
            prefs().edit().remove(key).apply();
        }
        call.resolve();
    }

    @PluginMethod
    public void biometricStatus(PluginCall call) {
        JSObject result = new JSObject();
        boolean api = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
        boolean secure = false;
        try {
            android.app.KeyguardManager km =
                    (android.app.KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
            secure = km != null && km.isDeviceSecure();
        } catch (Exception ignored) {
        }
        result.put("available", api && secure);
        result.put("api", Build.VERSION.SDK_INT);
        call.resolve(result);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            call.reject("Biométrie non prise en charge par cette version Android");
            return;
        }

        String title = call.getString("title", "Déverrouiller Holophone");
        String subtitle = call.getString("subtitle", "Confirme ton identité");

        getActivity().runOnUiThread(() -> {
            try {
                Executor executor = getActivity().getMainExecutor();
                CancellationSignal signal = new CancellationSignal();
                AtomicBoolean completed = new AtomicBoolean(false);

                BiometricPrompt prompt = new BiometricPrompt.Builder(getActivity())
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setNegativeButton(
                                "Annuler",
                                executor,
                                (DialogInterface dialog, int which) -> {
                                    if (!completed.compareAndSet(false, true)) return;
                                    JSObject result = new JSObject();
                                    result.put("success", false);
                                    result.put("cancelled", true);
                                    call.resolve(result);
                                }
                        )
                        .build();

                prompt.authenticate(
                        signal,
                        executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                                super.onAuthenticationSucceeded(result);
                                if (!completed.compareAndSet(false, true)) return;
                                JSObject payload = new JSObject();
                                payload.put("success", true);
                                call.resolve(payload);
                            }

                            @Override
                            public void onAuthenticationError(int errorCode, CharSequence errString) {
                                super.onAuthenticationError(errorCode, errString);
                                if (!completed.compareAndSet(false, true)) return;
                                JSObject payload = new JSObject();
                                payload.put("success", false);
                                if (errorCode == BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED ||
                                        errorCode == BiometricPrompt.BIOMETRIC_ERROR_CANCELED) {
                                    payload.put("cancelled", true);
                                } else {
                                    payload.put("error", errString == null ? "Échec biométrique" : errString.toString());
                                }
                                call.resolve(payload);
                            }
                        }
                );
            } catch (Exception ex) {
                call.reject("Biométrie impossible : " + ex.getMessage(), ex);
            }
        });
    }
}
