package com.mudva.lumen;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(
        name = "VoiceCapture",
        permissions = {
                @Permission(
                        alias = "microphone",
                        strings = { Manifest.permission.RECORD_AUDIO }
                )
        }
)
public class VoiceCapturePlugin extends Plugin implements RecognitionListener {

    private SpeechRecognizer recognizer;
    private PluginCall pendingStartCall;
    private String requestedLanguage = "fr-FR";

    @PluginMethod
    public void ensurePermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Autorisation microphone absente");
            return;
        }

        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("Reconnaissance vocale Android indisponible");
            return;
        }

        String language = call.getString("language");
        requestedLanguage = (language == null || language.trim().isEmpty())
                ? Locale.getDefault().toLanguageTag()
                : language.trim();

        pendingStartCall = call;

        getActivity().runOnUiThread(() -> {
            try {
                ensureRecognizer();

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                );
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, requestedLanguage);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, requestedLanguage);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
                intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());

                recognizer.startListening(intent);

                JSObject result = new JSObject();
                result.put("started", true);
                call.resolve(result);
                pendingStartCall = null;
            } catch (Exception ex) {
                pendingStartCall = null;
                call.reject("Démarrage micro impossible : " + ex.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (recognizer != null) {
                    recognizer.stopListening();
                }
                call.resolve();
            } catch (Exception ex) {
                call.reject("Arrêt micro impossible : " + ex.getMessage());
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (recognizer != null) {
                    recognizer.cancel();
                }
                call.resolve();
            } catch (Exception ex) {
                call.reject("Annulation micro impossible : " + ex.getMessage());
            }
        });
    }

    private void ensureRecognizer() {
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }

        recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
        recognizer.setRecognitionListener(this);
    }

    private String firstResult(Bundle results) {
        if (results == null) {
            return "";
        }

        ArrayList<String> values =
                results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);

        if (values == null || values.isEmpty() || values.get(0) == null) {
            return "";
        }

        return values.get(0).trim();
    }

    private void emitText(String eventName, Bundle results) {
        JSObject payload = new JSObject();
        payload.put("text", firstResult(results));
        notifyListeners(eventName, payload, true);
    }

    private String errorText(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "erreur audio";
            case SpeechRecognizer.ERROR_CLIENT:
                return "reconnaissance annulée";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "permission microphone refusée";
            case SpeechRecognizer.ERROR_NETWORK:
                return "réseau vocal indisponible";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "délai réseau vocal dépassé";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "aucune parole reconnue";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "micro déjà occupé";
            case SpeechRecognizer.ERROR_SERVER:
                return "service vocal Android indisponible";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "aucune parole entendue";
            default:
                return "erreur vocale " + error;
        }
    }

    @Override
    public void onReadyForSpeech(Bundle params) {
        JSObject payload = new JSObject();
        payload.put("state", "ready");
        notifyListeners("state", payload, true);
    }

    @Override
    public void onBeginningOfSpeech() {
        JSObject payload = new JSObject();
        payload.put("state", "speech");
        notifyListeners("state", payload, true);
    }

    @Override
    public void onRmsChanged(float rmsdB) {
        JSObject payload = new JSObject();
        payload.put("rms", rmsdB);
        notifyListeners("level", payload, true);
    }

    @Override
    public void onBufferReceived(byte[] buffer) {
    }

    @Override
    public void onEndOfSpeech() {
        JSObject payload = new JSObject();
        payload.put("state", "end");
        notifyListeners("state", payload, true);
    }

    @Override
    public void onError(int error) {
        JSObject payload = new JSObject();
        payload.put("code", error);
        payload.put("message", errorText(error));
        notifyListeners("error", payload, true);
    }

    @Override
    public void onResults(Bundle results) {
        emitText("final", results);
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        emitText("partial", partialResults);
    }

    @Override
    public void onEvent(int eventType, Bundle params) {
    }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(() -> {
            if (recognizer != null) {
                recognizer.destroy();
                recognizer = null;
            }
        });
    }
}
