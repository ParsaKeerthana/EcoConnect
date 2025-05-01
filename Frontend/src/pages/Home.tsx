import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { Textarea } from "../components/Textarea";
import { Button } from "../components/Button";
import UserProfileCard from "../components/UserProfileCard";
import profileImage from "../components/profilepic.svg";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDistanceToNow } from "date-fns";
import Config from "../config/config.ts";
import { Users, UserPlus } from "lucide-react";

interface Post {
  postId?: string;
  content: string;
  authorId: string;
  createdDate?: string;
  userName?: string;
}

interface Event {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  dateTime: Date;
  participants: number;
}

interface User {
  id: string;
  userName: string;
  email: string;
  followers: string[];
  following: string[];
  location?: string;
  profileImage?: string;
  bio?: string;
}

export const Home: React.FC = () => {
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [feed, setFeed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const [token, setToken] = useState<string | null>(null); // token state
  const [isFetching, setIsFetching] = useState(false);
  const [canFetch, setCanFetch] = useState(true);
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [userData, setUserData] = useState<User | null>(null);

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

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < document.body.scrollHeight - window.innerHeight - 100) {
        setCanFetch(true); // 🚀 Unlock fetching if user scrolled up
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchOlderPosts = useCallback(async () => {
    if (!user?.sub || feed.length === 0 || isFetching || !canFetch) return;

    setIsFetching(true);
    setCanFetch(false); // 🚨 Lock after one fetch

    const oldest = feed[feed.length - 1]?.createdDate;
    if (!oldest) {
      setIsFetching(false);
      return;
    }

    try {
      const formattedOlderThan = toLocalDateTimeFormat(oldest);
      const res = await axios.get(
          `${Config.FEED_SERVICE_URL}/${user.sub}?limit=50&olderThan=${encodeURIComponent(
              formattedOlderThan
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
      );
      const newPosts: Post[] = res.data;

      const seen = new Set(feed.map((p) => p.postId));
      const filtered = newPosts.filter((p) => p.postId && !seen.has(p.postId));

      if (filtered.length > 0) {
        setFeed((prev) => [...prev, ...filtered]);
      }
    } catch (err) {
      console.error("Error fetching older posts:", err);
    } finally {
      setIsFetching(false);
    }
  }, [feed, token, user?.sub, isFetching, canFetch]);



  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !isFetching && canFetch) {
        fetchOlderPosts();
      }
    }, {
      rootMargin: "100px",
    });

    if (node) observer.current.observe(node);
  }, [fetchOlderPosts, isFetching, canFetch]);


  // Dummy data for fallback
  const getDummyFeed = (): Post[] => [
    {
      postId: "1",
      content: "This is a sample post about eco-friendly living!",
      authorId: "user1",
      createdDate: new Date().toISOString(),
      userName: "User1",
    },
    {
      postId: "2",
      content: "Check out this amazing event happening in our community!",
      authorId: "user2",
      createdDate: new Date(Date.now() - 3600000).toISOString(),
      userName: "User2",
    },
    {
      postId: "3",
      content: "Recycling tips: Always rinse your containers before recycling.",
      authorId: "user3",
      createdDate: new Date(Date.now() - 7200000).toISOString(),
      userName: "User3",
    },
  ];

  // Handle post submission
  const handlePostSubmit = async () => {
    if (!isAuthenticated || !user?.sub || !token) {
      toast.error("You're not logged in");
      return;
    }

    if (content.trim().length === 0 || content.trim().length > 250) {
      toast.error("Post must be between 1 and 250 characters");
      return;
    }

    // Prepare the post object
    const post: Post = {
      content: content.trim(),
      authorId: user.sub,
    };

    // **Clear the input immediately** for a smooth UI
    setContent("");
    setMessage("");

    try {
      await axios.post(`${Config.POST_SERVICE_URL}/createPost`, post, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Post created successfully!");
      fetchFeed(); // refresh feed after post
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    }
  };

  // Initial full fetch
  const fetchFeed = async () => {
    if (!user?.sub) return;

    setLoading(true);
    try {
      const res = await axios.get(
          `${Config.FEED_SERVICE_URL}/${user.sub}?limit=50`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
      );
      console.log('Feed Response Data:', res.data);
      console.log('First Post Data:', res.data[0]);
      const data: Post[] = res.data;

      // Fetch user names for each post
      const postsWithUserNames = await Promise.all(
        data.map(async (post) => {
          try {
            const userRes = await axios.get(
              `${Config.USER_SERVICE_URL}/getUserById/${post.authorId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            return {
              ...post,
              authorName: userRes.data.userName || "Anonymous"
            };
          } catch (error) {
            console.error("Error fetching user data:", error);
            return {
              ...post,
              authorName: "Anonymous"
            };
          }
        })
      );

      const seen = new Set<string>();
      const unique = postsWithUserNames.filter((p) => {
        if (!p.postId || seen.has(p.postId)) return false;
        seen.add(p.postId);
        return true;
      });

      setFeed(unique.length > 0 ? unique : getDummyFeed());
    } catch (error) {
      console.error("Error fetching feed:", error);
      toast.error("Failed to load feed");
      setFeed(getDummyFeed());
      setMessage("Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  const toLocalDateTimeFormat = (iso: string): string => {
    const date = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };



  useEffect(() => {
    if (!isAuthenticated) return;
    fetchFeed();
    fetchRegisteredEvents();
    fetchUserData();
  }, [isAuthenticated, user?.sub]);

  const fetchRegisteredEvents = async () => {
    if (!user?.sub) return;

    try {
      const response = await fetch(
        `${Config.EVENT_SERVICE_URL}/eventsByUser/${user.sub}`
      );
      if (!response.ok) throw new Error("Failed to fetch registered events");

      const data = await response.json();
      const now = new Date();

      const formattedEvents = data
        .map((event: any) => ({
          id: event.id,
          creatorId: event.creatorId,
          title: event.name,
          description: event.description,
          location: event.location,
          date: event.dateTime.split("T")[0],
          time: event.dateTime.split("T")[1].substring(0, 5),
          dateTime: new Date(event.dateTime),
          participants: event.rsvpUsers ? event.rsvpUsers.length : 0,
        }))
        .filter((event: Event) => event.dateTime > now)
        .sort((a: Event, b: Event) => a.dateTime.getTime() - b.dateTime.getTime())
        .slice(0, 3); // Only take the first 3 events

      setRegisteredEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching registered events:", error);
    }
  };

  const fetchUserData = async () => {
    if (!user?.sub) return;

    try {
      const res = await axios.get<User>(
        `${Config.USER_SERVICE_URL}/getUserById/${user.sub}`
      );
      setUserData(res.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <div className="flex justify-center">
        {/* Left Sidebar - User Profile */}
        <div className="hidden lg:block w-80 mr-8">
          <div className="sticky top-8">
            <div className="bg-white rounded-xl shadow-md border-2 border-[#1D3016] p-6">
              <div className="flex flex-col items-center">
                <img
                  src={userData?.profileImage || profileImage}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-2 border-[#1D3016] object-cover shadow-md hover:border-[#2a4520] transition-all duration-300"
                />
                <h2 className="text-xl font-bold text-[#1D3016] mt-4">
                  {userData?.userName || "User"}
                </h2>
                {userData?.bio && (
                  <p className="text-gray-600 text-center mt-2 italic">
                    {userData.bio}
                  </p>
                )}
                {userData?.location && (
                  <p className="text-gray-600 text-center mt-1">
                    📍 {userData.location}
                  </p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#1D3016]">
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">{userData?.followers.length || 0}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Followers</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#1D3016]">
                    <UserPlus className="w-5 h-5" />
                    <span className="font-semibold">{userData?.following.length || 0}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Following</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-xl flex flex-col gap-[30px]">
          <div className="flex flex-col gap-2.5">
            <Textarea
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-2 w-full p-4 border border-[#1D3016] rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-[#1D3016]"
            />
            <Button
                onClick={handlePostSubmit}
                className="mt-2 bg-[#1D3016] text-white rounded-md py-2 w-full"
                disabled={loading}
            >
              {loading ? "Posting..." : "Post"}
            </Button>
            {message && <p className="text-sm text-red-500 mt-2">{message}</p>}
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {loading && feed.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D3016]"></div>
                <span className="ml-3 text-gray-600">Loading feed...</span>
              </div>
            ) : feed.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-lg">No posts available.</p>
                <p className="text-gray-400 text-sm mt-2">Be the first to share something!</p>
              </div>
            ) : (
              feed.map((post, index) => {
                const isLast = index === feed.length - 1;
                return (
                  <div
                    key={post.postId}
                    ref={isLast ? lastPostRef : null}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:translate-y-[-2px] border-2 border-[#1D3016] overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0">
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="w-12 h-12 rounded-full border-2 border-[#1D3016] object-cover shadow-md hover:border-[#2a4520] transition-all duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-[#1D3016] truncate hover:text-[#2a4520] transition-colors">
                                {post.authorName}
                              </h3>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-500">
                                {post.createdDate
                                  ? formatDistanceToNow(new Date(post.createdDate), {
                                      addSuffix: true,
                                    })
                                  : "Just now"}
                              </span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap break-words mt-2 leading-relaxed">
                              {post.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {loading && feed.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1D3016]"></div>
                <span className="ml-2 text-gray-600">Loading more...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Upcoming Events */}
        <div className="hidden lg:block w-80 ml-8">
          <div className="sticky top-8">
            <div className="bg-white rounded-xl shadow-md border-2 border-[#1D3016] p-6">
              <h2 className="text-2xl font-bold text-[#1D3016] mb-4">Upcoming Events</h2>
              {registeredEvents.length === 0 ? (
                <p className="text-gray-500">No upcoming events</p>
              ) : (
                <div className="space-y-4">
                  {registeredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0"
                    >
                      <h3 className="font-semibold text-[#1D3016] mb-2">{event.title}</h3>
                      <div className="text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <span>📅</span>
                          {event.date} at {event.time}
                        </p>
                        <p className="flex items-center gap-2 mt-1">
                          <span>📍</span>
                          {event.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};