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
    <div className="max-w-4xl mx-auto py-8 px-4 min-h-[calc(100vh-64px)] bg-gradient-to-b from-gray-50 to-white">
      {/* Profile Header Section */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300 border-2 border-[#1d3016]">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="relative group">
            <img
              src={userData?.profileImage || "/default-avatar.png"}
              alt="Profile"
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#1d3016] shadow-lg group-hover:border-[#2a4520] transition-all duration-300"
            />
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold text-[#1d3016] mb-2">
              {userData?.userName}
            </h1>
            <p className="text-lg text-gray-600 mb-3 italic">
              {userData?.bio || "This user hasn't added a bio yet."}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 mb-4">
              <Mail className="w-5 h-5" />
              <span>{userData?.email}</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500">
              <UserIcon className="w-5 h-5" />
              <span>📍 {userData?.location || "Location not set"}</span>
            </div>

            <button
              onClick={() => setIsEditingProfile(true)}
              className="mt-6 bg-[#1d3016] text-white py-2.5 px-6 rounded-full shadow-lg hover:bg-[#2a4520] transform hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center gap-2 mx-auto md:mx-0"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-[1.02] border-2 border-[#1d3016]">
          <div className="flex items-center justify-between">
            <div className="bg-[#1d3016] bg-opacity-10 p-3 rounded-full">
              <Users className="w-6 h-6 text-[#1d3016]" />
            </div>
            <span className="text-3xl font-bold text-[#1d3016]">{userData?.followers.length}</span>
          </div>
          <p className="mt-2 text-gray-600 font-medium">Followers</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-[1.02] border-2 border-[#1d3016]">
          <div className="flex items-center justify-between">
            <div className="bg-[#1d3016] bg-opacity-10 p-3 rounded-full">
              <UserPlus className="w-6 h-6 text-[#1d3016]" />
            </div>
            <span className="text-3xl font-bold text-[#1d3016]">{userData?.following.length}</span>
          </div>
          <p className="mt-2 text-gray-600 font-medium">Following</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-[1.02] border-2 border-[#1d3016]">
          <div className="flex items-center justify-between">
            <div className="bg-[#1d3016] bg-opacity-10 p-3 rounded-full">
              <Edit3 className="w-6 h-6 text-[#1d3016]" />
            </div>
            <span className="text-3xl font-bold text-[#1d3016]">{posts.length}</span>
          </div>
          <p className="mt-2 text-gray-600 font-medium">Posts</p>
        </div>
      </div>

      {/* Posts Section */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#1d3016] mb-6 flex items-center gap-3">
          <Edit3 className="w-6 h-6" />
          Your Posts
        </h2>
        <ul className="space-y-6">
          {displayedPosts.map((post, index) => {
            const isLast = index === displayedPosts.length - 1;
            return (
              <li
                key={post.postId}
                ref={isLast ? lastPostRef : undefined}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-[#1d3016]"
              >
                {editPostId === post.postId ? (
                  <>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full border-2 border-[#1d3016] rounded-xl p-4 mb-4 resize-none focus:ring-2 focus:ring-[#1d3016] focus:outline-none"
                      rows={3}
                    />
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleSave(post.postId)}
                        className="flex items-center gap-2 bg-[#1d3016] text-white py-2 px-4 rounded-lg hover:bg-[#2a4520] transition-colors duration-300"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditPostId(null)}
                        className="flex items-center gap-2 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors duration-300"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-800 text-lg mb-4">{post.content}</p>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <CalendarDays className="w-4 h-4" />
                        {formatDate(post.lastModifiedDate)}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(post)}
                          className="flex items-center gap-1 text-[#1d3016] hover:text-[#2a4520] transition-colors duration-300 bg-[#1d3016] bg-opacity-10 px-3 py-1.5 rounded-lg hover:bg-opacity-20"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(post.postId!)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors duration-300 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
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
          <div className="text-center py-12">
            <Edit3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">You have no posts yet.</p>
          </div>
        )}

        {/* Infinite Scroll Indicator */}
        {displayedPosts.length === posts.length && displayedPosts.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No more posts to show</p>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer position="bottom-right" />
    </div>
  );
}
