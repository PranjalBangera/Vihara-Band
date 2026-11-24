package com.viharaband.companion;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ViharaBackgroundPlugin.class);
        super.onCreate(savedInstanceState);
        try {
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (controller != null) {
                // Ensure status bar icons are crisp white on dark backgrounds
                controller.setAppearanceLightStatusBars(false);
            }
        } catch (Exception ignored) {}
    }
}
