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
  Settings,
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

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    receiveEventNotifications: false,
    receiveProductNotifications: false,
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
      if (
          entries[0].isIntersecting &&
          displayedPosts.length < posts.length
      ) {
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

  const fetchPreferences = async () => {
    if (!user?.sub) return;
    try {
      const res = await axios.get(
          `${Config.NOTIFICATION_SERVICE_URL}/${user.sub}`
      );
      setPreferences({
        receiveEventNotifications: res.data.receiveEventNotifications || false,
        receiveProductNotifications: res.data.receiveProductNotifications || false,
      });
      setIsPreferencesOpen(true);
    } catch (err) {
      console.error("Failed to fetch preferences", err);
      toast.error("Failed to fetch notification settings.");
    }
  };

  const savePreferences = async () => {
    if (!user?.sub) return;
    try {
      await axios.post(
          `${Config.NOTIFICATION_SERVICE_URL}/${user.sub}`,
          preferences
      );
      toast.success("Notification preferences saved!");
      setIsPreferencesOpen(false);
    } catch (err) {
      console.error("Failed to save preferences", err);
      toast.error("Failed to save notification settings.");
    }
  };

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
      <div className="max-w-3xl mx-auto mt-10 p-4 h-[calc(100vh-64px)] flex flex-col">
        <ToastContainer />

        {/* Sticky Profile Card */}
        <div className="sticky top-16 z-10 bg-white border shadow-lg rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <UserIcon className="w-10 h-10 text-[#1d3016]" />
            <h1 className="text-3xl font-semibold text-[#1d3016]">
              Your Profile
            </h1>
          </div>
          <div className="ml-2 space-y-3 text-gray-700 relative">
            <p className="flex items-center gap-2">
              <UserIcon size={18} className="text-[#1d3016]" />{" "}
              <strong>Name:</strong> {userData?.userName}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={18} className="text-[#1d3016]" />{" "}
              <strong>Email:</strong> {userData?.email}
            </p>
            <p className="flex items-center gap-2">
              <Users size={18} className="text-[#1d3016]" />{" "}
              <strong>Followers:</strong> {userData?.followers.length}
            </p>
            <p className="flex items-center gap-2">
              <UserPlus size={18} className="text-[#1d3016]" />{" "}
              <strong>Following:</strong> {userData?.following.length}
            </p>
            <p className="flex items-center gap-2">📍 <strong>Location:</strong> {userData?.location || "N/A"}</p>
            <p className="flex items-center gap-2">📝 <strong>About me:</strong> {userData?.bio || "N/A"}</p>

            {/* Edit and Settings buttons */}
            <button
                onClick={() => setIsEditingProfile(true)}
                className="absolute bottom-4 right-14 bg-white border rounded-full p-2 shadow hover:bg-gray-100 group"
            >
              <Pencil size={18} className="text-gray-600 group-hover:text-black" />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Edit
            </span>
            </button>

            <button
                onClick={fetchPreferences}
                className="absolute bottom-4 right-4 bg-white border rounded-full p-2 shadow hover:bg-gray-100 group"
            >
              <Settings size={18} className="text-gray-600 group-hover:text-black" />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Settings
            </span>
            </button>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {isEditingProfile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md space-y-4">
                <h2 className="text-xl font-semibold text-[#1d3016] mb-2">Edit Profile</h2>
                <p>Location:</p>
                <input
                    type="text"
                    name="location"
                    value={profileForm.location}
                    onChange={handleProfileInputChange}
                    placeholder="Location"
                    className="w-full p-2 border border-[#1d3016] rounded"
                />
                <p>About:</p>
                <textarea
                    name="bio"
                    value={profileForm.bio}
                    onChange={handleProfileInputChange}
                    placeholder="Bio"
                    rows={3}
                    className="w-full p-2 border border-[#1d3016] rounded resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                      onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </button>
                  <button
                      className="bg-[#1d3016] hover:bg-[#162c10] text-white px-4 py-2 rounded"
                      onClick={handleSaveProfile}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Notification Preferences Modal */}
        {isPreferencesOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md space-y-4">
                <h2 className="text-xl font-semibold text-[#1d3016] mb-2">
                  Notification Preferences
                </h2>
                <div className="flex flex-col gap-4">
                  <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={preferences.receiveEventNotifications}
                        onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              receiveEventNotifications: e.target.checked,
                            }))
                        }
                    />
                    Receive Event Notifications
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={preferences.receiveProductNotifications}
                        onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              receiveProductNotifications: e.target.checked,
                            }))
                        }
                    />
                    Receive Product Notifications
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                      onClick={() => setIsPreferencesOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                      className="bg-[#1d3016] hover:bg-[#162c10] text-white px-4 py-2 rounded"
                      onClick={savePreferences}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Scrollable Posts Section */}
        <div className="flex-1 overflow-y-auto pr-1">
          <h2 className="text-2xl font-bold mb-4 text-[#1d3016]">Your Posts</h2>
          <ul className="space-y-4">
            {displayedPosts.map((post, index) => (
                <li
                    key={post.postId}
                    className="bg-white p-4 border border-[#1d3016] rounded-xl shadow"
                    ref={index === displayedPosts.length - 1 ? lastPostRef : undefined}
                >
                  {editPostId === post.postId ? (
                      <>
                  <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full border border-[#1d3016] rounded p-2 mb-3 resize-none"
                      rows={3}
                  />
                        <div className="flex gap-3">
                          <button
                              onClick={() => handleSave(post.postId)}
                              className="flex items-center gap-1 bg-[#1d3016] hover:bg-[#162c10] text-white px-3 py-1.5 rounded"
                          >
                            <Save size={16} /> Save
                          </button>
                          <button
                              onClick={() => setEditPostId(null)}
                              className="flex items-center gap-1 bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 rounded"
                          >
                            <X size={16} /> Cancel
                          </button>
                        </div>
                      </>
                  ) : (
                      <>
                        <p className="mb-2 text-gray-800">{post.content}</p>
                        <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                          <CalendarDays size={16} />
                          {formatDate(post.lastModifiedDate)}
                        </div>
                        <div className="flex gap-2">
                          <button
                              className="flex items-center gap-1 text-[#1d3016] hover:underline"
                              onClick={() => handleEdit(post)}
                          >
                            <Edit3 size={16} /> Edit
                          </button>
                          <button
                              className="flex items-center gap-1 text-red-600 hover:underline"
                              onClick={() => handleDelete(post.postId!)}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </>
                  )}
                </li>
            ))}
          </ul>
        </div>
      </div>
  );
}
