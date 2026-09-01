package com.blueos.audiobook.domain

data class Chapter(val id: String, val bookId: String, val title: String, val content: String, val durationMs: Long, val localUri: String? = null)
data class Book(val id: String, val title: String, val author: String, val chapters: List<Chapter> = emptyList())
data class TransferTask(val id: String, val chapterId: String, val bytesSent: Long, val totalBytes: Long, val status: Status, val errorCode: String? = null) {
    enum class Status { PENDING, TRANSFERRING, COMPLETE, FAILED }
}
