package com.ecoconnect.notificationservice.Service;

import com.ecoconnect.notificationservice.Model.User;
import com.ecoconnect.notificationservice.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getUser(String userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).orElse(null);
    }


    public void addFollower(String followeeId, String followerId, String followerEmail, String followeeEmail) {
        User followee = getUser(followeeId);
        if (followee == null) {
            followee = new User();
            followee.setUserId(followeeId);
            followee.setEmail(followeeEmail);
            followee.setFollowers(new HashMap<>());
        }

        User follower = getUser(followerId);
        if (follower == null) {
            follower = new User();
            follower.setUserId(followerId);
            follower.setEmail(followerEmail);
            follower.setFollowers(new HashMap<>());
            userRepository.save(follower);
        }

        followee.getFollowers().put(followerId, followerEmail);
        userRepository.save(followee);
    }

    public void removeFollower(String followeeId, String followerId) {
        User followee = getUser(followeeId);
        if (followee == null) return;

        followee.getFollowers().remove(followerId);
        userRepository.save(followee);
    }
}
