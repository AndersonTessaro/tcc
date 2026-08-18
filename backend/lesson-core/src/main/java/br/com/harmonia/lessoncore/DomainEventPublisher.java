package br.com.harmonia.lessoncore;

/** Port implemented by the consuming application to dispatch domain events raised by this module. */
public interface DomainEventPublisher {
    void publish(Object event);
}
