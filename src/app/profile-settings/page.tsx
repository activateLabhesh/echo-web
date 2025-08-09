"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("/User_profil.png");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [editing, setEditing] = useState({
    name: false,
    username: false,
    about: false,
  });
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {

        const res=await axios.get(`${API_BASE_URL}/profile/getProfile`, {

         withCredentials: true,

        });
        console.log(res);
        const profile = res.data.user;

        setDisplayName(profile.fullname);
        setUsername(profile.username);
        setAbout(profile.bio);
        setEmail(profile.email);
        setPhone(profile.phone);
        setAvatar(profile.avatar_url || "/User_profil.png");
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
     fetchProfile();
  }, []);

  // Track if something changes for enabling save button
  useEffect(() => {
    setChanged(true);
  }, [displayName, username, about, avatarFile]);

  // Handle Avatar Upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);

    // For preview as soon as selected
    const tempUrl = URL.createObjectURL(file);
    setAvatar(tempUrl);
  };

  // Trigger avatar input click
  const avatarInput = useRef<HTMLInputElement | null>(null);

  const triggerAvatarInput = () => {
    avatarInput.current?.click();
  };
  // Save profile changes
  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append("fullname", displayName);
      formData.append("username", username);
      formData.append("bio", about);
      if (avatarFile) formData.append("avatar_url", avatarFile);

      const response = await axios.patch(`${API_BASE_URL}/profile/updateProfile`, formData, {
        withCredentials: true,
      });

      alert("Profile updated!");

      // Update your local state with returned user data
      const updatedUser = response.data.user;
      setDisplayName(updatedUser.fullname);
      setUsername(updatedUser.username);
      setAbout(updatedUser.bio);
      setAvatar(updatedUser.avatar_url || "/User_profil.png");

      setChanged(false);
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Failed to update profile");
    }
  };


  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/profile/deleteProfile`, {
        withCredentials: true,
      });
      alert("Account deleted.");
    } catch (err) {
      console.error("Failed to delete profile", err);
    }
  };

  return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center p-10 select-none">
        <div className="flex flex-col md:flex-row gap-10 w-full max-w-6xl">
          {/* Left: Profile Card & About */}
          <div className="flex-1">
            <div className="relative rounded-3xl text-center text-white shadow-xl p-12 overflow-hidden">
              <div className="absolute inset-0 z-0 bg-black bg-opacity-95"
                   style={{
                     backgroundImage: "url('/profile-bg.png')",
                     backgroundSize: "cover",
                     backgroundPosition: "center",
                   }}
              />
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <Image
                      src={avatar}
                      alt="Profile"
                      width={120}
                      height={120}
                      className="rounded-full border-4 border-blue-400 object-cover"
                  />
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black" />
                </div>
                <h2 className="text-xl font-semibold mt-4">{displayName}</h2>
                <p className="text-sm text-gray-300">{username}</p>
                <input
                    ref={avatarInput}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                />
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                      className="bg-blue-700 text-white px-4 py-1 rounded-md text-sm font-semibold hover:bg-blue-800"
                      onClick={triggerAvatarInput}
                  >
                    Change Avatar
                  </button>
                  <button
                      className="bg-gray-700 text-white px-4 py-1 rounded-md text-sm"
                      onClick={() => {
                        setAvatar("/User_profil.png");
                        setAvatarFile(null);
                      }}
                      disabled={!avatarFile}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="mt-6 max-w-[480px]">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm">About</h3>
                <button onClick={() =>
                    setEditing((prev) => ({ ...prev, about: !prev.about }))
                }
                >
                  ✏️
                </button>
              </div>
              {editing.about ? (
                  <textarea
                      value={about}
                      autoFocus
                      onChange={(e) => setAbout(e.target.value)}
                      onBlur={() => setEditing((prev) => ({ ...prev, about: false }))}
                      className="bg-[#444] border border-gray-300 text-sm text-white p-4 rounded-xl w-full h-40 resize-none focus:outline-none"
                  />
              ) : (
                  <div
                      className="bg-[#444] border border-gray-300 text-sm text-white p-4 rounded-xl w-full h-40 cursor-pointer"
                      onClick={() =>
                          setEditing((prev) => ({ ...prev, about: true }))
                      }
                      title="Click to edit bio"
                  >
                    {about || "Click to add a bio..."}
                  </div>
              )}
            </div>
          </div>

          {/* Right Side: Info Fields + Buttons */}
          <div className="flex flex-col justify-between w-full md:w-1/2">
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm">Display Name</label>
                  <span
                      className="text-sm cursor-pointer"
                      onClick={() =>
                          setEditing((prev) => ({ ...prev, name: !prev.name }))
                      }
                  >
                  ✏️
                </span>
                </div>
                <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    readOnly={!editing.name}
                    autoFocus={editing.name}
                    onBlur={() => setEditing((prev) => ({ ...prev, name: false }))}
                    className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
                />
              </div>

              {/* Username */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm">Username</label>
                  <span
                      className="text-sm cursor-pointer"
                      onClick={() =>
                          setEditing((prev) => ({ ...prev, username: !prev.username }))
                      }
                  >
                </span>
                </div>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    readOnly={!editing.username}
                    autoFocus={editing.username}
                    onBlur={() =>
                        setEditing((prev) => ({ ...prev, username: false }))
                    }
                    className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                    value={email}
                    readOnly
                    className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
                />
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm mb-1">Phone Number</label>
                <input
                    value={phone}
                    readOnly
                    className="w-full p-2 rounded-md bg-[#222] border border-white/30 text-white"
                />
              </div>
            </div>
            {/* Save Changes Button */}
            {successMessage && (
                <div className={`rounded-md p-2 text-sm font-semibold
                  ${successMessage === "Profile updated!" ? "bg-green-700 text-green-100" : "bg-red-700 text-red-100"}
                `}>
                  {successMessage}
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={!changed}
                className={`w-fit self-start text-sm px-8 py-1 rounded-md font-semibold -mt-28 ml-auto
                  ${changed ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-700 text-gray-300 opacity-60 cursor-not-allowed"}
                `}
                style={{ marginRight: "6px" }}
            >
              Save Changes
            </button>
            {/* Buttons in One Row */}
            <div className="flex flex-row flex-nowrap gap-6 mt-10 overflow-x-auto">
              <button className="bg-yellow-400 text-black px-6 py-2 rounded-md font-semibold hover:brightness-110 whitespace-nowrap">
                Change Password
              </button>
              <button
                  className="bg-blue-800 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-900 whitespace-nowrap"
                  onClick={() => router.push("/delete-account")}
              >
                Delete Account
              </button>
              <button
                  type="button"
                  onClick={() => router.push("/profile")}  // update path if needed
                  className="bg-blue-800 text-white px-12 py-2 rounded-md font-semibold hover:bg-blue-900 whitespace-nowrap"
              >
                Profile
              </button>
            </div>

          </div>
        </div>
      </div>
  );
}
