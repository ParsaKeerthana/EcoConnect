import { useEffect, useState, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Config from "../config/config.ts";
import axios from "axios";
import {
  User as UserIcon,
  Mail,
  Users,
  UserPlus,
  Pencil,
  Save,
  X,
  Trash2,
  Edit3,
  CalendarDays,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Post {
  postId: string;
  content: string;
  authorId: string;
  createdDate?: string;
  lastModifiedDate?: string;
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

export function Profile() {
  const { user, isAuthenticated } = useAuth0();
  const [userData, setUserData] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    location: "",
    bio: "",
    profileImage: "",
  });

  const POSTS_PER_PAGE = 5;
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.sub) return;

      try {
        const res = await axios.get<User>(
          `${Config.USER_SERVICE_URL}/getUserById/${user.sub}`
        );
        const fetchedUser = res.data;
        setUserData(fetchedUser);

        const postsRes = await axios.get<Post[]>(
          `${Config.POST_SERVICE_URL}/getUserPosts/${fetchedUser.id}`
        );
        setPosts(postsRes.data);
        setDisplayedPosts(postsRes.data.slice(0, POSTS_PER_PAGE));
        setPage(1);
      } catch (error) {
        console.error("Error fetching profile data", error);
      }
    };

    fetchUserData();
  }, [user?.sub]);

  useEffect(() => {
    if (userData) {
      setProfileForm({
        location: userData.location || "",
        bio: userData.bio || "",
        profileImage: userData.profileImage || "",
      });
    }
  }, [userData]);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && displayedPosts.length < posts.length) {
        const nextPage = page + 1;
        const nextSlice = posts.slice(0, nextPage * POSTS_PER_PAGE);
        setDisplayedPosts(nextSlice);
        setPage(nextPage);
      }
    });

    if (lastPostRef.current) {
      observer.current.observe(lastPostRef.current);
    }

    return () => observer.current?.disconnect();
  }, [posts, displayedPosts, page]);

  const handleEdit = (post: Post) => {
    setEditPostId(post.postId || null);
    setEditContent(post.content);
  };

  const handleSave = async (postId: string) => {
    if (!userData) return;
    try {
      await axios.put(
        `${Config.POST_SERVICE_URL}/updatePost/${userData.id}/${postId}?isAdmin=false`,
        {
          content: editContent,
        }
      );
      setPosts((prev) =>
        prev.map((post) =>
          post.postId === postId ? { ...post, content: editContent } : post
        )
      );
      setDisplayedPosts((prev) =>
        prev.map((post) =>
          post.postId === postId ? { ...post, content: editContent } : post
        )
      );
      setEditPostId(null);
      toast.success("Post updated successfully!");
    } catch (error) {
      console.error("Failed to update post", error);
      toast.error("Failed to update post.");
    }
  };

  const handleDelete = async (postId: string) => {
    if (!userData) return;
    try {
      await axios.delete(
        `${Config.POST_SERVICE_URL}/deletePost/${userData.id}/${postId}?isAdmin=false`
      );
      const filtered = posts.filter((post) => post.postId !== postId);
      setPosts(filtered);
      setDisplayedPosts(filtered.slice(0, page * POSTS_PER_PAGE));
      toast.success("Post deleted successfully!");
    } catch (error) {
      console.error("Failed to delete post", error);
      toast.error("Failed to delete post.");
    }
  };

  const handleProfileInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!userData) return;

    try {
      const res = await axios.put(
        `${Config.USER_SERVICE_URL}/${userData.userName}`,
        {
          ...userData,
          location: profileForm.location,
          profileImage: profileForm.profileImage,
          bio: profileForm.bio,
        }
      );
      setUserData(res.data);
      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile", err);
      toast.error("Failed to update profile.");
    }
  };

  const formatDate = (isoDate?: string) => {
    if (!isoDate) return "N/A";
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (!isAuthenticated)
    return (
      <div className="text-center mt-8 text-gray-600">
        Please log in to view your profile.
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto mt-10 p-4 h-[calc(100vh-64px)] flex flex-col bg-gray-50 rounded-xl">
      {/* Profile Section */}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 flex gap-6 items-center">
        <img
          src={userData?.profileImage || "/default-avatar.png"}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border-4 border-[#1d3016]"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-[#1d3016]">
            {userData?.userName}
          </h1>
          <p className="text-gray-600">
            {userData?.bio || "This user hasn't added a bio yet."}
          </p>
          <p className="text-gray-500">
            📍 {userData?.location || "Location not set"}
          </p>

          {/* Edit Profile Button */}
          <button
            onClick={() => setIsEditingProfile(true)}
            className="mt-4 bg-[#1d3016] text-white py-2 px-4 rounded-full shadow-md hover:bg-[#162c10] transition-colors duration-200"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-lg font-semibold text-[#1d3016]">Followers</p>
          <p className="text-2xl font-bold text-[#1d3016]">
            {userData?.followers.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-lg font-semibold text-[#1d3016]">Following</p>
          <p className="text-2xl font-bold text-[#1d3016]">
            {userData?.following.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-lg font-semibold text-[#1d3016]">Posts</p>
          <p className="text-2xl font-bold text-[#1d3016]">{posts.length}</p>
        </div>
      </div>

      {/* Posts Section */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#1d3016] mb-4">Your Posts</h2>
        <ul className="space-y-4">
          {displayedPosts.map((post, index) => {
            const isLast = index === displayedPosts.length - 1;
            return (
              <li
                key={post.postId}
                ref={isLast ? lastPostRef : undefined}
                className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border-4 border-[#1d3016]"
              >
                {editPostId === post.postId ? (
                  <>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full border border-[#1d3016] rounded p-2 mb-3 resize-none"
                      rows={3}
                    />
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleSave(post.postId)}
                        className="bg-[#1d3016] text-white py-2 px-4 rounded-md hover:bg-[#162c10] transition-colors duration-200"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditPostId(null)}
                        className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-gray-800">{post.content}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} />
                        {formatDate(post.lastModifiedDate)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(post)}
                          className="text-[#1d3016] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(post.postId!)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {/* Empty State for Posts */}
        {displayedPosts.length === 0 && (
          <p className="text-center text-gray-500 mt-4">
            You have no posts yet.
          </p>
        )}

        {/* Infinite Scroll Indicator */}
        {displayedPosts.length === posts.length && (
          <p className="text-center text-gray-500 mt-4">
            No more posts to show.
          </p>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
