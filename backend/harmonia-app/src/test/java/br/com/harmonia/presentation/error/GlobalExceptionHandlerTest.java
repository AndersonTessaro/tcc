package br.com.harmonia.presentation.error;

import br.com.harmonia.application.lesson.LessonSeriesConflictException;
import br.com.harmonia.domain.common.ResourceInUseException;
import br.com.harmonia.infrastructure.storage.StorageUnavailableException;
import br.com.harmonia.lessoncore.ScheduleConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {
    @Test
    void scheduleConflictsUseSpecificHandlersAndPreserveSingleLessonResponse() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new ConflictController())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

        String body = mvc.perform(get("/series-conflict"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SCHEDULE_CONFLICT")))
            .andExpect(jsonPath("$.fields", contains("2027-03-10", "2027-03-24")))
            .andReturn().getResponse().getContentAsString();
        System.out.println("Series conflict response: " + body);

        mvc.perform(get("/single-conflict"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SCHEDULE_CONFLICT")))
            .andExpect(jsonPath("$.message", is("Original policy message")))
            .andExpect(jsonPath("$.fields", is(List.of())));
    }

    @RestController
    static class ConflictController {
        @GetMapping("/series-conflict")
        void seriesConflict() {
            throw new LessonSeriesConflictException(List.of(LocalDate.of(2027, 3, 24), LocalDate.of(2027, 3, 10)));
        }

        @GetMapping("/single-conflict")
        void singleConflict() {
            throw new ScheduleConflictException("Original policy message");
        }
    }

    @Test
    void resourceInUseBecomes409WithAStableCode() {
        var response = new GlobalExceptionHandler().resourceInUse(new ResourceInUseException("Instrument is in use"));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("RESOURCE_IN_USE");
        assertThat(response.getBody().message()).isEqualTo("Instrument is in use");
    }

    @Test
    void storageFailureBecomes503WithoutProviderDetails() {
        var response = new GlobalExceptionHandler()
            .storageUnavailable(new StorageUnavailableException(new RuntimeException("drive quota secret")));

        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody().code()).isEqualTo("STORAGE_UNAVAILABLE");
        assertThat(response.getBody().message()).isEqualTo("File storage is unavailable");
    }
}
