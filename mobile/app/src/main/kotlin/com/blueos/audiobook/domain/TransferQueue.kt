package com.blueos.audiobook.domain

/** Transport is injected so this queue can use the confirmed BlueOS BLE contract. */
interface ChapterTransport {
    suspend fun send(chapter: Chapter, onProgress: (Long, Long) -> Unit): Result<Unit>
}

class TransferQueue(private val transport: ChapterTransport) {
    private val tasks = LinkedHashMap<String, TransferTask>()

    fun enqueue(chapter: Chapter, totalBytes: Long): TransferTask {
        val task = TransferTask(chapter.id, chapter.id, 0, totalBytes, TransferTask.Status.PENDING)
        tasks[task.id] = task
        return task
    }

    suspend fun retry(chapter: Chapter): TransferTask {
        val current = tasks[chapter.id] ?: error("Task not found")
        tasks[chapter.id] = current.copy(status = TransferTask.Status.TRANSFERRING, errorCode = null)
        val result = transport.send(chapter) { sent, total ->
            tasks[chapter.id] = current.copy(bytesSent = sent, totalBytes = total, status = TransferTask.Status.TRANSFERRING)
        }
        val updated = if (result.isSuccess) tasks[chapter.id]!!.copy(status = TransferTask.Status.COMPLETE)
        else tasks[chapter.id]!!.copy(status = TransferTask.Status.FAILED, errorCode = result.exceptionOrNull()?.message)
        tasks[chapter.id] = updated
        return updated
    }

    fun all(): List<TransferTask> = tasks.values.toList()
}
