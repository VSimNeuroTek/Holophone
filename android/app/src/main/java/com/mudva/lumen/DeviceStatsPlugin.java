package com.mudva.lumen;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Debug;
import android.os.Process;
import android.os.SystemClock;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeviceStats")
public class DeviceStatsPlugin extends Plugin {

    private long lastCpuMs = -1L;
    private long lastWallMs = -1L;
    private final int coreCount = Math.max(1, Runtime.getRuntime().availableProcessors());

    @PluginMethod
    public synchronized void getStats(PluginCall call) {
        long cpuMs = Process.getElapsedCpuTime();
        long wallMs = SystemClock.elapsedRealtime();

        double cpuPercent = 0.0;
        if (lastCpuMs >= 0L && lastWallMs >= 0L) {
            long cpuDelta = Math.max(0L, cpuMs - lastCpuMs);
            long wallDelta = Math.max(1L, wallMs - lastWallMs);
            cpuPercent = 100.0 * ((double) cpuDelta / ((double) wallDelta * (double) coreCount));
            cpuPercent = Math.max(0.0, Math.min(100.0, cpuPercent));
        }

        lastCpuMs = cpuMs;
        lastWallMs = wallMs;

        Debug.MemoryInfo memoryInfo = new Debug.MemoryInfo();
        Debug.getMemoryInfo(memoryInfo);
        double ramMb = memoryInfo.getTotalPss() / 1024.0;

        ActivityManager activityManager =
                (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);

        int memoryClassMb = activityManager != null ? activityManager.getMemoryClass() : 256;
        double ramPercent = memoryClassMb > 0
                ? Math.max(0.0, Math.min(100.0, 100.0 * ramMb / memoryClassMb))
                : 0.0;

        JSObject result = new JSObject();
        result.put("cpuPercent", cpuPercent);
        result.put("ramMb", ramMb);
        result.put("ramPercent", ramPercent);
        result.put("heapLimitMb", memoryClassMb);
        result.put("cores", coreCount);
        call.resolve(result);
    }
}
