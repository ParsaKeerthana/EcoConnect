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

interface Post {
  postId?: string;
  content: string;
  authorId: string;
  createdDate?: string;
  authorName?: string;
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

  useEffect(() => {
    const fetchToken = async () => {
      if (isAuthenticated) {
        try {
          const accessToken = await getAccessTokenSilently();
          setToken(accessToken);
        } catch (error) {
          console.error("Error getting access token:", error);
        }
      }
    };

    fetchToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.scrollY <
        document.body.scrollHeight - window.innerHeight - 100
      ) {
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
        `${Config.FEED_SERVICE_URL}/${
          user.sub
        }?limit=50&olderThan=${encodeURIComponent(formattedOlderThan)}`,
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
  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          const first = entries[0];
          if (first.isIntersecting && !isFetching && canFetch) {
            fetchOlderPosts();
          }
        },
        {
          rootMargin: "100px",
        }
      );

      if (node) observer.current.observe(node);
    },
    [fetchOlderPosts, isFetching, canFetch]
  );

  // Dummy data for fallback
  const getDummyFeed = (): Post[] => [
    {
      postId: "1",
      content: "This is a sample post about eco-friendly living!",
      authorId: "user1",
      createdDate: new Date().toISOString(),
      authorName: "User1",
    },
    {
      postId: "2",
      content: "Check out this amazing event happening in our community!",
      authorId: "user2",
      createdDate: new Date(Date.now() - 3600000).toISOString(),
      authorName: "User2",
    },
    {
      postId: "3",
      content: "Recycling tips: Always rinse your containers before recycling.",
      authorId: "user3",
      createdDate: new Date(Date.now() - 7200000).toISOString(),
      authorName: "User3",
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
        `${Config.FEED_SERVICE_URL}/${user.sub}?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data: Post[] = res.data;

      const seen = new Set<string>();
      const unique = data.filter((p) => {
        if (!p.postId || seen.has(p.postId)) return false;
        seen.add(p.postId);
        return true;
      });

      setFeed(unique);
    } catch (error) {
      console.error("Error fetching feed:", error);
      toast.error("Failed to load feed");
    } finally {
      setLoading(false);
    }
  };
  const toLocalDateTimeFormat = (iso: string): string => {
    const date = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchFeed();
  }, [isAuthenticated, user?.sub]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <div className="flex justify-center">
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
              <p className="text-center text-gray-500">Loading feed...</p>
            ) : feed.length === 0 ? (
              <p className="text-center text-gray-500">No posts available.</p>
            ) : (
              feed.map((post, index) => {
                const isLast = index === feed.length - 1;
                return (
                  <div
                    key={post.postId}
                    ref={isLast ? lastPostRef : null}
                    className="flex flex-col gap-4 p-4 border rounded-md bg-gray-50 shadow-md"
                  >
                    <div className="flex gap-3 items-start">
                      <UserProfileCard
                        userName={post.authorName}
                        postContent={post.content}
                        profileImage={profileImage}
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      {post.createdDate
                        ? formatDistanceToNow(new Date(post.createdDate), {
                            addSuffix: true,
                          })
                        : "Just now"}
                    </div>
                  </div>
                );
              })
            )}
            {loading && feed.length > 0 && (
              <p className="text-center text-gray-500">Loading more...</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
