package br.com.harmonia.application.admin;

import br.com.harmonia.application.gamification.port.PracticeRepository;
import br.com.harmonia.application.profile.port.ClassGroupRepository;
import br.com.harmonia.application.profile.port.EnrollmentRepository;
import br.com.harmonia.application.profile.port.InstrumentRepository;
import br.com.harmonia.application.profile.port.TeacherRepository;
import br.com.harmonia.domain.common.ResourceInUseException;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.profile.EnrollmentStatus;
import br.com.harmonia.infrastructure.persistence.profile.Instrument;
import br.com.harmonia.infrastructure.persistence.profile.Teacher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminInstrumentDeleteUseCaseTest {
    @Mock InstrumentRepository instruments;
    @Mock TeacherRepository teachers;
    @Mock EnrollmentRepository enrollments;
    @Mock ClassGroupRepository classGroups;
    @Mock PracticeRepository practices;
    @InjectMocks AdminRegistrationUseCase uc;

    @Test
    void deletesAnInstrumentWithoutBusinessReferences() {
        Instrument instrument = instrument();
        when(instruments.findById(instrument.getId())).thenReturn(Optional.of(instrument));

        uc.deleteInstrument(instrument.getId());

        verify(enrollments).existsByInstrumentId(instrument.getId());
        verify(classGroups).existsByInstrumentId(instrument.getId());
        verify(practices).existsByInstrumentId(instrument.getId());
        verify(instruments).delete(instrument);
    }

    @Test
    void removesOnlyTheDeletedInstrumentFromAllLinkedTeachers() {
        Instrument instrument = instrument();
        Instrument other = instrument();
        Teacher active = new Teacher();
        Teacher inactive = new Teacher();
        inactive.setActive(false);
        for (Teacher teacher : List.of(active, inactive)) {
            teacher.getInstruments().add(instrument);
            teacher.getInstruments().add(other);
        }
        when(instruments.findById(instrument.getId())).thenReturn(Optional.of(instrument));
        when(teachers.findByInstrumentsId(instrument.getId())).thenReturn(List.of(active, inactive));

        uc.deleteInstrument(instrument.getId());

        assertThat(active.getInstruments()).containsExactly(other);
        assertThat(inactive.getInstruments()).containsExactly(other);
        verify(instruments).delete(instrument);
    }

    @Test
    void rejectsAnOpenEnrollmentWithoutChangingTeacherLinks() {
        Instrument instrument = instrument();
        UUID id = instrument.getId();
        when(instruments.findById(id)).thenReturn(Optional.of(instrument));
        when(enrollments.existsByInstrumentIdAndStatusNot(id, EnrollmentStatus.CLOSED)).thenReturn(true);

        assertThatThrownBy(() -> uc.deleteInstrument(id)).isInstanceOf(ResourceInUseException.class);

        assertThat(instrument.getActive()).isTrue();
        verify(instruments, never()).delete(any());
        verifyNoInteractions(teachers);
    }

    @ParameterizedTest
    @ValueSource(strings = {"closedEnrollment", "classGroup", "practice"})
    void hidesAnInstrumentThatOnlyHasHistory(String reference) {
        Instrument instrument = instrument();
        UUID id = instrument.getId();
        Teacher teacher = new Teacher();
        teacher.getInstruments().add(instrument);
        when(instruments.findById(id)).thenReturn(Optional.of(instrument));
        when(teachers.findByInstrumentsId(id)).thenReturn(List.of(teacher));
        switch (reference) {
            case "closedEnrollment" -> when(enrollments.existsByInstrumentId(id)).thenReturn(true);
            case "classGroup" -> when(classGroups.existsByInstrumentId(id)).thenReturn(true);
            case "practice" -> when(practices.existsByInstrumentId(id)).thenReturn(true);
            default -> throw new IllegalArgumentException(reference);
        }

        uc.deleteInstrument(id);

        assertThat(instrument.getActive()).isFalse();
        assertThat(teacher.getInstruments()).isEmpty();
        verify(instruments, never()).delete(any());
    }

    @Test
    void rejectsAnUnknownInstrumentBeforeCheckingReferences() {
        UUID id = UUID.randomUUID();
        when(instruments.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> uc.deleteInstrument(id)).isInstanceOf(ResourceNotFoundException.class);

        verify(instruments, never()).delete(any());
        verifyNoInteractions(enrollments, classGroups, practices, teachers);
    }

    private Instrument instrument() {
        Instrument instrument = new Instrument();
        instrument.setId(UUID.randomUUID());
        return instrument;
    }
}
