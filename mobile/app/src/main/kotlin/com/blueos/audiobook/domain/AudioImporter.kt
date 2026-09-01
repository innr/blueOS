package com.blueos.audiobook.domain

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns

class AudioImporter(private val resolver: ContentResolver) {
    fun import(uri: Uri, bookId: String, chapterId: String): Chapter {
        val name = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0) else null
        } ?: "chapter.mp3"
        require(name.endsWith(".mp3", ignoreCase = true)) { "Only MP3 is supported in v1" }
        return Chapter(chapterId, bookId, name.removeSuffix(".mp3"), 0L, uri.toString())
    }
}
