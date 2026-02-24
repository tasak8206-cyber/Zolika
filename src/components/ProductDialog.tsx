import React, { useState } from 'react';

interface ProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProductDialog = ({ isOpen, onClose }: ProductDialogProps) => {
    const [productName, setProductName] = useState('');
    const [productPrice, setProductPrice] = useState('');
    const [productDescription, setProductDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle product submission logic here
        console.log({ productName, productPrice, productDescription });
        // Reset form fields
        setProductName('');
        setProductPrice('');
        setProductDescription('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="product-dialog">
            <h2>Add New Product</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        Product Name:
                        <input 
                            type="text" 
                            value={productName} 
                            onChange={(e) => setProductName(e.target.value)} 
                            required 
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Product Price:
                        <input 
                            type="number" 
                            value={productPrice} 
                            onChange={(e) => setProductPrice(e.target.value)} 
                            required 
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Product Description:
                        <textarea 
                            value={productDescription} 
                            onChange={(e) => setProductDescription(e.target.value)} 
                            required 
                        />
                    </label>
                </div>
                <button type="submit">Add Product</button>
                <button type="button" onClick={onClose}>Cancel</button>
            </form>
        </div>
    );
};

export default ProductDialog;