
import React, { useState, useEffect } from "react";
import FormInput from "@/Components/Common/FormInput";

export default function JobCategoryForm({ category = null, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    image: null,
    image_preview: null
  });

  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);


  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        image: null,
        image_preview: category.image_path || null
      });
    }
  }, [category]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'image') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({
          ...prev,
          image: file,
          image_preview: URL.createObjectURL(file)
        }));
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));


    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setProcessing(true);
    // Create a copy of formData for submission
    const dataToSubmit = {
      name: formData.name,
      image: formData.image
    };

    onSubmit(dataToSubmit);

    setTimeout(() => {
      setProcessing(false);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row">
        <div className="col-md-12">
          <FormInput
            label="Category Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="Enter category name (e.g., Tarpaulin, T-shirt Printing)"
            required
          />
        </div>

        <div className="col-md-12 mt-3">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Category Image</label>
          <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-orange-300 transition-colors bg-gray-50/50">
            <div className="w-24 h-24 rounded-lg bg-white border overflow-hidden flex-shrink-0 relative group">
              {formData.image_preview ? (
                <>
                  <img
                    src={formData.image_preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <i className="ti-image text-white text-xl"></i>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <i className="ti-image text-2xl mb-1"></i>
                  <span className="text-[10px]">No Image</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                name="image"
                id="category-image"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />
              <label
                htmlFor="category-image"
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-all shadow-sm"
              >
                <i className="ti-upload mr-2"></i> Select Image
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Recommended: Square image (1:1), Max 2MB.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 d-flex justify-content-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={processing}
          className={`px-4 py-2.5 text-sm font-medium text-white rounded-md transition
                        ${processing ? "bg-orange-400 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700 focus:ring-2 focus:ring-orange-400"}
                    `}>

          {processing ?
            <span className="flex items-center">
              <i className="ti-reload mr-2 animate-spin"></i> Saving...
            </span> :

            <span className="flex items-center">
              <i className="ti-save mr-2"></i> {category ? "Update" : "Save"}
            </span>
          }
        </button>
      </div>
    </form>);

}