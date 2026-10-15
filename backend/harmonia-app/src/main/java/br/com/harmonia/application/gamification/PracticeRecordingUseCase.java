package br.com.harmonia.application.gamification;

import br.com.harmonia.application.context.CurrentUserService;
import br.com.harmonia.application.storage.StorageTransactions;
import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.domain.common.OwnershipException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.domain.gamification.PracticeRecordingRule;
import br.com.harmonia.infrastructure.persistence.gamification.Practice;
import br.com.harmonia.infrastructure.persistence.gamification.PracticeRecording;
import br.com.harmonia.infrastructure.storage.FileStoragePort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.UUID;

@Service
public class PracticeRecordingUseCase {
    private final PracticeRepository practices;
    private final EnrollmentRepository enrollments;
    private final FileStoragePort storage;
    private final CurrentUserService current;

    public PracticeRecordingUseCase(PracticeRepository practices, EnrollmentRepository enrollments,
                                    FileStoragePort storage, CurrentUserService current) {
        this.practices = practices;
        this.enrollments = enrollments;
        this.storage = storage;
        this.current = current;
    }

    @Transactional
    public Practice attach(UUID practiceId, MultipartFile file) {
        Practice practice = findPractice(practiceId);
        current.assertOwnedByCurrentStudent(practice.getStudent());
        String fileName = displayName(file.getOriginalFilename());
        try {
            // ponytail: whole file in memory; switch to InputStream if uploads grow.
            byte[] content = file.getBytes();
            PracticeRecordingRule.validate(fileName, file.getContentType(), file.getSize(),
                Arrays.copyOf(content, Math.min(content.length, PracticeRecordingRule.HEAD_BYTES)));
            String newPath = storage.save(fileName, content);
            String oldPath = practice.getRecording() == null ? null : practice.getRecording().getStoragePath();
            StorageTransactions.deleteOnRollback(storage, newPath);
            StorageTransactions.deleteAfterCommit(storage, oldPath);
            practice.setRecording(new PracticeRecording(fileName, newPath, file.getContentType(),
                file.getSize(), LocalDateTime.now()));
            return practices.save(practice);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Transactional(readOnly = true)
    public byte[] downloadMine(UUID practiceId) {
        Practice practice = findPractice(practiceId);
        current.assertOwnedByCurrentStudent(practice.getStudent());
        return storage.read(requireRecording(practice).getStoragePath());
    }

    @Transactional(readOnly = true)
    public byte[] downloadAsTeacher(UUID practiceId) {
        Practice practice = findPractice(practiceId);
        if (!current.isAdmin() && enrollments.findByTeacherIdAndStudentId(
            current.currentTeacher().getId(), practice.getStudent().getId()).isEmpty())
            throw new OwnershipException("Student is not linked to this teacher");
        return storage.read(requireRecording(practice).getStoragePath());
    }

    private Practice findPractice(UUID practiceId) {
        return practices.findById(practiceId).orElseThrow(() -> new ResourceNotFoundException("Practice"));
    }

    // recording_file_name is NOT NULL VARCHAR(255) when a recording exists; keep the tail so the extension survives.
    private static String displayName(String original) {
        String name = original == null || original.isBlank() ? "gravacao" : original.strip();
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    private PracticeRecording requireRecording(Practice practice) {
        if (practice.getRecording() == null)
            throw new ResourceNotFoundException("Recording");
        return practice.getRecording();
    }
}
