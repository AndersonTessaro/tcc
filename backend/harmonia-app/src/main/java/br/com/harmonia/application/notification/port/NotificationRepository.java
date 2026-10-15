package br.com.harmonia.application.notification.port;

import br.com.harmonia.infrastructure.persistence.notification.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserIdOrderByCreatedAtDescIdDesc(UUID userId, Pageable pageable);
    long countByUserIdAndReadAtIsNull(UUID userId);
    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("update Notification n set n.readAt = :readAt where n.userId = :userId and n.readAt is null")
    int markAllRead(UUID userId, LocalDateTime readAt);

    @Modifying
    @Query("delete from Notification n where n.createdAt < :cutoff")
    int deleteOlderThan(LocalDateTime cutoff);

    @Modifying
    @Query(value = """
        insert into notification (user_id, type, title, body, student_id, lesson_id, dedupe_key, created_at)
        values (:userId, :type, :title, :body, :studentId, :lessonId, :dedupeKey, :createdAt)
        on conflict (user_id, dedupe_key) do nothing
        """, nativeQuery = true)
    int insertIfAbsent(UUID userId, String type, String title, String body,
                       UUID studentId, UUID lessonId, String dedupeKey, LocalDateTime createdAt);
}
