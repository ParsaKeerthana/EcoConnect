package com.ecoconnect.notificationservice.Service;

import com.ecoconnect.notificationservice.Model.UserPreference;
import com.ecoconnect.notificationservice.Repository.UserPreferenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserPreferenceService {

    private final UserPreferenceRepository preferenceRepository;

    @Autowired
    public UserPreferenceService(UserPreferenceRepository preferenceRepository) {
        this.preferenceRepository = preferenceRepository;
    }

    public UserPreference getUserPreferences(String userId) {
        return preferenceRepository.findById(userId).orElse(new UserPreference());
    }

    public void updateUserPreferences(String userId, UserPreference preferences) {
        preferences.setUserId(userId);
        preferenceRepository.save(preferences);
    }
}
