package com.stsmobile

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.math.ceil

class SirenPlayerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SirenPlayer"

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var savedAlarmVolume: Int = -1

    @ReactMethod
    fun play(volumePercent: Double, promise: Promise) {
        try {
            release()

            val context = reactApplicationContext
            val audioManager =
                context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

            // Save current alarm volume and set to the user's desired absolute level
            val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            savedAlarmVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
            val targetVol = ceil(volumePercent / 100.0 * maxVol).toInt().coerceIn(0, maxVol)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, targetVol, 0)

            // Play siren on the alarm stream — independent of ringer/media volume
            val mp = MediaPlayer.create(context, R.raw.siren)
            mp.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            mp.isLooping = true
            mp.setVolume(1.0f, 1.0f)
            mp.start()
            mediaPlayer = mp

            // Start repeating vibration pattern at the native level so it
            // works reliably even when the screen is off.
            startVibration()

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SIREN_PLAY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            release()
            restoreVolume()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SIREN_STOP_ERROR", e.message, e)
        }
    }

    private fun release() {
        mediaPlayer?.let {
            if (it.isPlaying) it.stop()
            it.release()
        }
        mediaPlayer = null
        stopVibration()
    }

    private fun getVibrator(): Vibrator {
        val context = reactApplicationContext
        return if (Build.VERSION.SDK_INT >= 31) {
            val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    private fun startVibration() {
        val vib = getVibrator()
        // Pattern: wait 0ms, vibrate 500ms, pause 300ms, vibrate 500ms, pause 300ms, vibrate 500ms, pause 2000ms
        val pattern = longArrayOf(0, 500, 300, 500, 300, 500, 2000)
        vib.vibrate(VibrationEffect.createWaveform(pattern, 0)) // 0 = repeat from index 0
        vibrator = vib
    }

    private fun stopVibration() {
        vibrator?.cancel()
        vibrator = null
    }

    @ReactMethod
    fun checkFullScreenIntent(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                val nm = reactApplicationContext
                    .getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (!nm.canUseFullScreenIntent()) {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                        Uri.parse("package:${reactApplicationContext.packageName}")
                    )
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(false)
                    return
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FSI_CHECK_ERROR", e.message, e)
        }
    }

    private fun restoreVolume() {
        if (savedAlarmVolume >= 0) {
            val audioManager =
                reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, savedAlarmVolume, 0)
            savedAlarmVolume = -1
        }
    }
}
