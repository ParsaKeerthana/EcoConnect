import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "../components/Button";
import { Text } from "../components/Text";
import { Img } from "../components/Img";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Config from "../config/config.ts";

type User = {
  id: string;
  userName: string;
  email: string;
  followers: string[];
  following: string[];
  isFollowing: boolean;
  location?: string;
  bio?: string;
  profileImageUrl?: string;
};

export function Network() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "followers" | "following">("discover");
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastUserRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const { user: currentUser, isAuthenticated,  getAccessTokenSilently } = useAuth0();

  const USERS_PER_PAGE = 25;

  useEffect(() => {
    const fetchToken = async () => {
      if (isAuthenticated) {
        try {
          const accessToken = await getAccessTokenSilently();
          setToken(accessToken);
        } catch (error) {
          console.error('Error getting access token:', error);
        }
      }
    };

    fetchToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  const fetchUsers = useCallback(async (pageToFetch = 1) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let endpoint = `/getAllUsers`;
      if (activeTab === "followers") {
        endpoint = `/${currentUser.sub}/followers`;
      } else if (activeTab === "following") {
        endpoint = `/${currentUser.sub}/following`;
      }

      const res = await axios.get(`${Config.USER_SERVICE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data: User[] = res.data;

      const filteredData =
          activeTab === "discover"
              ? data.filter((user) => !user.followers.includes(currentUser.sub))
              : data;

      const pagedData = filteredData.slice(0, USERS_PER_PAGE * pageToFetch);

      const usersWithFollowStatus = pagedData.map((user) => ({
        ...user,
        isFollowing: user.followers?.includes(currentUser.sub) || false,
      }));

      if (pageToFetch === 1) {
        setUsers(usersWithFollowStatus);
      } else {
        setUsers((prev) => [...prev, ...usersWithFollowStatus]);
      }

      setHasMore(pagedData.length < filteredData.length);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentUser?.sub]);

  // Fetch users when active tab changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setPage(1);
      setUsers([]);
      setHasMore(true);
      setFollowedUsers(new Set());
      fetchUsers(1);
    }
  }, [activeTab, isAuthenticated, currentUser, fetchUsers]);

  // Fetch next page when page increments
  useEffect(() => {
    if (page === 1) return; // Page 1 already fetched in tab switch
    fetchUsers(page);
  }, [page, fetchUsers]);

  // Infinite scroll observer
  useEffect(() => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage((prev) => prev + 1);
      }
    });

    if (lastUserRef.current) {
      observer.current.observe(lastUserRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [users, loading, activeTab, hasMore]);

  const handleFollow = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!currentUser) return;
    try {
      const endpoint = currentlyFollowing
          ? `/${currentUser.sub}/unfollow/${targetUserId}`
          : `/${currentUser.sub}/follow/${targetUserId}`;

      await axios.post(`${Config.USER_SERVICE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },});

      if (activeTab === "following") {
        setUsers((prev) => prev.filter((user) => user.id !== targetUserId));
      } else if (activeTab === "followers") {
        setUsers((prev) =>
            prev.map((user) =>
                user.id === targetUserId
                    ? { ...user, isFollowing: !currentlyFollowing }
                    : user
            )
        );
      } else if (activeTab === "discover" && !currentlyFollowing) {
        setFollowedUsers((prev) => new Set(prev).add(targetUserId));
      }

      toast.success(currentlyFollowing ? "Unfollowed successfully" : "Followed successfully");
    } catch (err) {
      console.error("Error following/unfollowing user", err);
      toast.error("Something went wrong");
    }
  };

  const filteredUsers = users.filter((user) =>
      user.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <ToastContainer position="top-right" autoClose={2000} hideProgressBar />

        <div className="sticky top-16 z-10 bg-gray-50 shadow-sm px-6 md:px-8 py-3">
          <div className="container mx-auto">
            <div className="flex gap-10 mb-3">
              {["discover", "followers", "following"].map((tab) => (
                  <Button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`${
                          activeTab === tab
                              ? "text-[#1d3016] border-b-4 border-[#1d3016] px-6 py-3 text-xl font-bold"
                              : "text-[#1d3016] hover:bg-[#f0f0f0] border-b-4 border-transparent px-6 py-3 text-xl font-bold"
                      } rounded-md transition-all duration-300`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Button>
              ))}
            </div>

            <div className="relative">
              <input
                  type="text"
                  placeholder="Search by username..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#1d3016] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d3016]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-8">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading && users.length === 0 ? (
                  <Text className="text-xl">Loading users...</Text>
              ) : filteredUsers.length === 0 ? (
                  <Text className="text-xl">No users found.</Text>
              ) : (
                  filteredUsers.map((user, index) => (
                      <div
                          key={user.id}
                          ref={index === filteredUsers.length - 1 ? lastUserRef : null}
                          className="bg-white shadow-lg rounded-xl border border-[#1d3016] p-5 hover:shadow-xl transition-all duration-300 w-80"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <Img
                              src={user.profileImageUrl || "images/profilepic.svg"}
                              alt="Profile"
                              className="w-15 h-14 rounded-full"
                          />
                          <div>
                            <Text className="text-lg font-semibold text-[#1d3016]">
                              {user.userName}
                            </Text>
                            {user.bio && (
                                <Text className="text-sm text-gray-600 mt-1">
                                  {user.bio}
                                </Text>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 mb-4">
                          {user.location && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Img src="images/location.svg" alt="Location" className="w-4 h-4 mr-1" />
                                {user.location}
                              </div>
                          )}
                          <div className="flex items-center text-base font-medium text-gray-700 gap-4">
                            <div className="flex items-center">
                              <Img src="images/participants.svg" alt="Followers" className="w-5 h-5 mr-2" />
                              <span>{user.followers.length} Followers</span>
                            </div>
                            <span className="text-lg font-semibold text-gray-400">|</span>
                            <div className="flex items-center">
                              <Img src="images/participants.svg" alt="Following" className="w-5 h-5 mr-2" />
                              <span>{user.following.length} Following</span>
                            </div>
                          </div>
                        </div>

                        {isAuthenticated &&
                            user.id !== currentUser?.sub &&
                            activeTab !== "followers" && (
                                <Button
                                    onClick={() => handleFollow(user.id, user.isFollowing)}
                                    disabled={activeTab === "discover" && followedUsers.has(user.id)}
                                    className={`w-full rounded-md px-4 py-2 text-sm transition-all ${
                                        user.isFollowing
                                            ? "bg-red-600 text-white hover:bg-red-700"
                                            : activeTab === "discover" && followedUsers.has(user.id)
                                                ? "bg-gray-400 text-white cursor-not-allowed"
                                                : "bg-[#1d3016] text-white hover:bg-[#162c10]"
                                    }`}
                                >
                                  {user.isFollowing ? "Unfollow" : "Follow"}
                                </Button>
                            )}
                      </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
  );
}