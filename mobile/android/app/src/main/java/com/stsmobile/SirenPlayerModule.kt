package com.stsmobile

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.math.ceil

class SirenPlayerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SirenPlayer"

    private var mediaPlayer: MediaPlayer? = null
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
