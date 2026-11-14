package br.com.harmonia.presentation.response;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

public record CreatedLessonResponse(@JsonUnwrapped LessonResponse lesson, int occurrences) {
}
