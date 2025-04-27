package com.ecoconnect.eventservice.Service;

import com.ecoconnect.eventservice.Exception.InvalidEventException;
import com.ecoconnect.eventservice.Model.Event;
import com.ecoconnect.eventservice.Repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service

public class EventService {
    private final EventRepository eventRepository;
    private final EventPublisher eventPublisher;

    @Autowired
    public EventService(EventRepository eventRepository, EventPublisher eventPublisher)
    {
        this.eventRepository = eventRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Event createEvent(Event event)
    {
        validateEvent(event);
        Event savedEvent = eventRepository.save(event);
        eventPublisher.publishEventCreated(savedEvent.getId(), savedEvent.getCreatorId(), savedEvent.getName());

        return savedEvent;
    }

    private void validateEvent(Event event) {
        if (event == null) {
            throw new InvalidEventException("Event object cannot be null");
        }
        if (event.getId() == null || event.getId().isBlank()) {
            throw new InvalidEventException("Event ID is required");
        }
        if (event.getCreatorId() == null || event.getCreatorId().isBlank()) {
            throw new InvalidEventException("Creator ID is required");
        }
        if (event.getName() == null || event.getName().isBlank()) {
            throw new InvalidEventException("Event name is required");
        }
        if (event.getDateTime() == null) {
            throw new InvalidEventException("Event date and time are required");
        }
        if (event.getDateTime().isBefore(LocalDateTime.now())) {
            throw new InvalidEventException("Event date must be in the future");
        }
        if (eventRepository.existsById(event.getId())) {
            throw new RuntimeException("Event with the given ID already exists");
        }
    }

    public List<Event> getAllEvents()
    {
        return eventRepository.findAll();
    }

    @Transactional
    public Event rsvpToEvent(String eventId, String userId, String userEmail)
    {
        Event event = eventRepository.findEventById(eventId)
                        .orElseThrow(() -> new RuntimeException("No event found with given id "+ eventId));

        List<String> userIds = event.getRsvpUsers();
        if(userIds == null)
                userIds = new ArrayList<String>();
//        if(userIds.contains(userId))
//            throw new RuntimeException("User already registered");
        userIds.add(userId);
        event.setRsvpUsers(userIds);
        eventRepository.save(event);
        eventPublisher.publishEventRSVP(eventId, userId, event.getName(), userEmail);
        return event;
    }

    public Event updateEvent(String eventId, Event updatedEvent) {
        Event existingEvent = eventRepository.findEventById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        existingEvent.setName(updatedEvent.getName() != null ? updatedEvent.getName() : existingEvent.getName());
        existingEvent.setDescription(updatedEvent.getDescription() != null ? updatedEvent.getDescription() : existingEvent.getDescription());
        existingEvent.setLocation(updatedEvent.getLocation() != null ? updatedEvent.getLocation() : existingEvent.getLocation());
        existingEvent.setDateTime(updatedEvent.getDateTime() != null ? updatedEvent.getDateTime() : existingEvent.getDateTime());

        return eventRepository.save(existingEvent);
    }

    public void deleteEvent(String eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new RuntimeException("Event not found");
        }
        eventRepository.deleteById(eventId);
    }

    public List<Event> getEventsByUserId(String userId) {
        return eventRepository.findByRsvpUsersContains(userId);
    }

}
