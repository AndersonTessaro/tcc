package br.com.harmonia.application.admin;

import br.com.harmonia.application.profile.port.SchoolRepository;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.profile.School;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class SchoolUseCase {
    private final SchoolRepository schools;

    public SchoolUseCase(SchoolRepository schools) {
        this.schools = schools;
    }

    public List<School> list() {
        return schools.findAll(Sort.by("name"));
    }

    @Transactional
    public School create(String name) {
        School school = new School();
        school.setName(name.trim());
        return schools.save(school);
    }

    @Transactional
    public School update(UUID id, String name, boolean active) {
        School school = schools.findById(id).orElseThrow(() -> new ResourceNotFoundException("School"));
        school.setName(name.trim());
        school.setActive(active);
        return schools.save(school);
    }
}
