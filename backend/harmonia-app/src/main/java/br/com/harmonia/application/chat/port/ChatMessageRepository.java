package br.com.harmonia.application.chat.port;

import br.com.harmonia.infrastructure.persistence.chat.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    interface ConversationSummary {
        UUID getProfileId();
        String getProfileName();
        String getLastMessage();
        LocalDateTime getLastMessageAt();
        long getUnread();
    }

    @Query(value = """
        select exists (
            select 1 from enrollment e
            join teacher t on t.id = e.teacher_id
            join auth_user tu on tu.id = t.user_id
            join student s on s.id = e.student_id
            join auth_user su on su.id = s.user_id
            where e.teacher_id = :teacherId and e.student_id = :studentId
              and e.status = 'ACTIVE' and tu.school_id = su.school_id
        )
        """, nativeQuery = true)
    boolean hasActivePair(UUID teacherId, UUID studentId);

    @Query(value = """
        select s.id as profileId, coalesce(nullif(trim(su.display_name), ''), su.username) as profileName,
               latest.body as lastMessage, latest.created_at as lastMessageAt,
               (select count(*) from chat_message m
                where m.teacher_id = t.id and m.student_id = s.id
                  and m.sender_user_id = su.id and m.read_at is null) as unread
        from teacher t
        join auth_user tu on tu.id = t.user_id
        join auth_user su on su.school_id = tu.school_id
        join student s on s.user_id = su.id
        left join lateral (
            select m.body, m.created_at from chat_message m
            where m.teacher_id = t.id and m.student_id = s.id
            order by m.created_at desc, m.id desc limit 1
        ) latest on true
        where t.id = :teacherId and exists (
            select 1 from enrollment e where e.teacher_id = t.id and e.student_id = s.id and e.status = 'ACTIVE'
        )
        order by latest.created_at desc nulls last, profileName, s.id
        """, nativeQuery = true)
    List<ConversationSummary> listForTeacher(UUID teacherId);

    @Query(value = """
        select t.id as profileId, coalesce(nullif(trim(tu.display_name), ''), tu.username) as profileName,
               latest.body as lastMessage, latest.created_at as lastMessageAt,
               (select count(*) from chat_message m
                where m.teacher_id = t.id and m.student_id = s.id
                  and m.sender_user_id = tu.id and m.read_at is null) as unread
        from student s
        join auth_user su on su.id = s.user_id
        join auth_user tu on tu.school_id = su.school_id
        join teacher t on t.user_id = tu.id
        left join lateral (
            select m.body, m.created_at from chat_message m
            where m.teacher_id = t.id and m.student_id = s.id
            order by m.created_at desc, m.id desc limit 1
        ) latest on true
        where s.id = :studentId and exists (
            select 1 from enrollment e where e.teacher_id = t.id and e.student_id = s.id and e.status = 'ACTIVE'
        )
        order by latest.created_at desc nulls last, profileName, t.id
        """, nativeQuery = true)
    List<ConversationSummary> listForStudent(UUID studentId);

    @Query(value = """
        select count(*) from chat_message m
        join teacher t on t.id = m.teacher_id
        join auth_user tu on tu.id = t.user_id
        join student s on s.id = m.student_id
        join auth_user su on su.id = s.user_id
        where t.id = :teacherId and m.sender_user_id = su.id and m.read_at is null
          and tu.school_id = su.school_id and exists (
              select 1 from enrollment e where e.teacher_id = t.id and e.student_id = s.id and e.status = 'ACTIVE'
          )
        """, nativeQuery = true)
    long unreadForTeacher(UUID teacherId);

    @Query(value = """
        select count(*) from chat_message m
        join teacher t on t.id = m.teacher_id
        join auth_user tu on tu.id = t.user_id
        join student s on s.id = m.student_id
        join auth_user su on su.id = s.user_id
        where s.id = :studentId and m.sender_user_id = tu.id and m.read_at is null
          and tu.school_id = su.school_id and exists (
              select 1 from enrollment e where e.teacher_id = t.id and e.student_id = s.id and e.status = 'ACTIVE'
          )
        """, nativeQuery = true)
    long unreadForStudent(UUID studentId);

    @Query(value = """
        select * from chat_message where teacher_id = :teacherId and student_id = :studentId
        order by created_at desc, id desc limit 200
        """, nativeQuery = true)
    List<ChatMessage> latestMessages(UUID teacherId, UUID studentId);

    @Modifying
    @Query("""
        update ChatMessage m set m.readAt = :readAt
        where m.teacherId = :teacherId and m.studentId = :studentId
          and m.senderUserId <> :readerUserId and m.readAt is null
        """)
    int markIncomingRead(UUID teacherId, UUID studentId, UUID readerUserId, LocalDateTime readAt);
}
