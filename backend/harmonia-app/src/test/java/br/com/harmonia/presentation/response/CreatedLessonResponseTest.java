package br.com.harmonia.presentation.response;

import br.com.harmonia.infrastructure.persistence.lesson.LessonStatus;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CreatedLessonResponseTest {
    @Test
    void creationResponseIsFlatAndOccurrencesAppearOnlyOnCreation() {
        var mapper = JsonMapper.builder().build();
        UUID id = UUID.randomUUID();
        var lesson = new LessonResponse(id, UUID.randomUUID(), UUID.randomUUID(), "Student", "Teacher", "Piano",
            LocalDate.of(2027, 1, 31), LocalTime.of(9, 0), LocalTime.of(10, 0), LessonStatus.SCHEDULED,
            null, null, null, null, false, null);

        Map<String, Object> original = JsonPath.read(mapper.writeValueAsString(lesson), "$");
        Map<String, Object> created = JsonPath.read(mapper.writeValueAsString(new CreatedLessonResponse(lesson, 1)), "$");

        assertThat(original).doesNotContainKey("occurrences");
        assertThat(created).containsAllEntriesOf(original).containsEntry("seriesId", null).containsEntry("occurrences", 1);
        assertThat(created).hasSize(original.size() + 1).doesNotContainKey("lesson");
    }
}
