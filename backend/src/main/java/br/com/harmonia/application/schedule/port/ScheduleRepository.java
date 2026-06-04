package br.com.harmonia.application.schedule.port;

import br.com.harmonia.infrastructure.persistence.schedule.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {
    List<Schedule> findByEnrollmentTeacherId(UUID teacherId);
}
