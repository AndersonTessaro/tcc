package br.com.harmonia.application.admin;

import br.com.harmonia.application.profile.port.SchoolRepository;
import br.com.harmonia.application.security.port.UserRepository;
import br.com.harmonia.domain.common.ResourceNotFoundException;
import br.com.harmonia.infrastructure.persistence.profile.School;
import br.com.harmonia.infrastructure.persistence.security.User;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SchoolUseCase {
    private final SchoolRepository schools;
    private final UserRepository users;

    public SchoolUseCase(SchoolRepository schools, UserRepository users) {
        this.schools = schools;
        this.users = users;
    }

    public List<School> list() {
        return schools.findAll(Sort.by("name"));
    }

    @Transactional(readOnly = true)
    public Map<UUID, List<User>> managersBySchool() {
        return users.findSchoolManagers().stream().collect(Collectors.groupingBy(User::getSchoolId));
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
