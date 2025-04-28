import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "../components/Button";
import { Text } from "../components/Text";
import { Img } from "../components/Img";
import { Heading } from "../components/Heading";
import { useNavigate } from "react-router-dom";
import  Chat  from "./Chat";
import Config from "../config/config.ts";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sellerId: string;
  postedDate?: string;
  image?: string;
}

interface Message {
  senderId: string;
  receiverId: string;
  productId: string;
  message: string;
  timestamp?: string;
}

export const Marketplace: React.FC = () => {
  const { user, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: 0 });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showManageProducts, setShowManageProducts] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [messageSeller, setMessageSeller] = useState<string | null>(null);

  // Chat States
//   const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
//   const [chatMessages, setChatMessages] = useState<Message[]>([]);
//   const [chatInput, setChatInput] = useState("");
//   const [showChatBox, setShowChatBox] = useState(false);

  useEffect(() => {
    fetchProducts();
    if (isAuthenticated && user) {
      fetchUserProducts();
    }
  }, [isAuthenticated, user]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${Config.MARKETPLACE_SERVICE_URL}/getAllProducts`);
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchUserProducts = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${Config.MARKETPLACE_SERVICE_URL}/seller/${user.sub}/products`);
      setUserProducts(res.data);
    } catch (err) {
      console.error("Error fetching user products:", err);
    }
  };

  const createOrUpdateProduct = async () => {
    if (!user) return;
    try {
      const productData = { ...newProduct, sellerId: user.sub };
      if (editingProduct) {
        await axios.put(`${Config.MARKETPLACE_SERVICE_URL}/${editingProduct.id}/updateProduct/${user.sub}`, productData);
        setEditingProduct(null);
      } else {
        await axios.post(`${Config.MARKETPLACE_SERVICE_URL}/createProduct`, productData);
      }
      setNewProduct({ name: "", description: "", price: 0 });
      setShowProductModal(false);
      fetchUserProducts();
    } catch (err) {
      console.error("Error saving product:", err);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!user) return;
    try {
      await axios.delete(`${Config.MARKETPLACE_SERVICE_URL}/${productId}/deleteProduct/${user.sub}`);
      fetchUserProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({ name: product.name, description: product.description, price: product.price });
    setShowProductModal(true);
  };

  const handleOpenChat = (product: Product) => {
    setMessageSeller(product.id);
  };

  const handleBack = () => {
      setMessageSeller(null);
    };


  const handleSendMessage = async () => {
    if (!user || !selectedProduct || chatInput.trim() === "") return;
    const message: Message = {
      senderId: user.sub,
      receiverId: selectedProduct.sellerId,
      productId: selectedProduct.id,
      message: chatInput,
    };
    try {
      const res = await axios.post(`${Config.MARKETPLACE_SERVICE_URL}/messages`, message);
      setChatMessages((prev) => [...prev, res.data]);
      setChatInput("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="container mx-auto px-6 md:px-8 py-10">
        <div className="flex justify-between items-center mb-6">
          <Heading size="headinglg" as="h1" className="text-[24px] font-bold text-[#1d3016]">Marketplace</Heading>
          <Button onClick={() => setShowManageProducts(!showManageProducts)} className="bg-[#1d3016] text-white px-6 py-3 rounded-md hover:bg-[#162c10] transition-all">
            {showManageProducts ? "View Marketplace" : "Manage My Products"}
          </Button>
        </div>

        {showManageProducts && !messageSeller ? (
          <>
            <Heading size="headingmd" as="h2" className="text-[20px] font-semibold text-[#1d3016] mb-4">Manage Your Products</Heading>
            <Button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className="bg-[#1d3016] text-white px-6 py-3 rounded-md hover:bg-[#162c10] mb-6">
              Create Product
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProducts.map((product) => (
                <div key={product.id} className="bg-white shadow-lg rounded-xl border-2 border-[#1d3016] p-6">
                  <Img src={product.image || "images/logistics-transfer.svg"} alt={product.name} className="h-[150px] w-full object-contain rounded-md mb-4" />
                  <Text className="text-2xl font-medium text-[#1d3016] mb-2">{product.name}</Text>
                  <Text className="text-sm text-gray-600 mb-2">{product.description}</Text>
                  <Text className="text-lg font-bold text-[#1d3016] mb-4">${product.price}</Text>
                  <div className="flex gap-4">
                    <Button onClick={() => editProduct(product)} className="bg-[#1d3016] text-white px-4 py-2 rounded-md">Edit</Button>
                    <Button onClick={() => deleteProduct(product.id)} className="bg-red-600 text-white px-4 py-2 rounded-md">Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : !messageSeller && (
          <>
            <Heading size="headingmd" as="h2" className="text-[20px] font-semibold text-[#1d3016] mb-4">All Products</Heading>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white shadow-lg rounded-xl border-2 border-[#1d3016] p-6">
                  <Img src={product.image || "images/logistics-transfer.svg"} alt={product.name} className="h-[150px] w-full object-contain rounded-md mb-4" />
                  <Text className="text-xl font-medium text-[#1d3016] mb-2">{product.name}</Text>
                  <Text className="text-lg font-bold text-[#1d3016] mb-4">${product.price}</Text>
                  <Button onClick={() => handleOpenChat(product)} className="bg-[#1d3016] text-white px-4 py-2 rounded-md hover:bg-[#162c10] transition-all">Message Seller</Button>
                </div>
              ))}
            </div>
          </>
        )}
        {/* Chat Box */}
        { messageSeller && (
            <Chat
            sellerId = {products.find(product => product.id === messageSeller)?.sellerId}
            productName = {products.find(product => product.id === messageSeller)?.name}
            productId = {products.find(product => product.id === messageSeller)?.id}
            senderId={user?.sub}
            onBack={handleBack}
            />
        )}



        {/* Product Modal */}
        {showProductModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <Heading size="headinglg" as="h3" className="text-[#1d3016] mb-4">
                {editingProduct ? "Edit Product" : "Create Product"}
              </Heading>
              <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Name" className="border p-2 w-full mb-2" />
              <textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Description" className="border p-2 w-full mb-2" />
              <input type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} placeholder="Price" className="border p-2 w-full mb-4" />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setShowProductModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md">Cancel</Button>
                <Button onClick={createOrUpdateProduct} className="bg-[#1d3016] text-white px-4 py-2 rounded-md">{editingProduct ? "Update" : "Create"}</Button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Box */}
       {/* {
            showChatBox && selectedProduct && (
          <div className="fixed bottom-4 right-4 w-96 bg-white shadow-lg border border-gray-300 rounded-lg p-4 z-50">
            <Heading size="headingmd" className="text-[#1d3016] mb-2">Chat with Seller</Heading>
            <Text className="text-sm text-gray-600 mb-2">About: <strong>{selectedProduct.name}</strong></Text>
            <div className="h-40 overflow-y-auto border border-gray-200 rounded-md p-2 mb-2 bg-gray-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-sm p-1 mb-1 rounded-md ${msg.senderId === user?.sub ? "text-right bg-green-100" : "text-left bg-gray-200"}`}>
                  {msg.message}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type your message..." className="flex-grow border border-gray-300 p-2 rounded-md" />
              <Button onClick={handleSendMessage} className="bg-[#1d3016] text-white px-3 py-2 rounded-md">Send</Button>
            </div>
            <button onClick={() => setShowChatBox(false)} className="absolute top-1 right-2 text-gray-500 hover:text-gray-800">×</button>
          </div>
            )
        } */}
      </div>
    </div>
  );
};
