
import React, { useState, useEffect } from "react";
import FormInput from "@/Components/Common/FormInput";

export default function JobTypeForm({ jobType = null, allcategories = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    description: "",
    price: "",
    price_by: "pcs",
    discount: "",
    incentive_price: "",
    is_active: true,
    show_in_dashboard: true,
    show_in_customer_view: true,
    sort_order: 0,
    brochure_link: "",
    has_colors: false,
    available_colors: []
  });

  const [priceTiers, setPriceTiers] = useState([]);
  const [sizeRates, setSizeRates] = useState([]);
  const [promoRules, setPromoRules] = useState([]);
  const [workflowSteps, setWorkflowSteps] = useState({
    printing: { enabled: false, incentive_price: "" },
    lamination_heatpress: { enabled: false, incentive_price: "" },
    cutting: { enabled: false, incentive_price: "" },
    sewing: { enabled: false, incentive_price: "" },
    dtf_press: { enabled: false, incentive_price: "" },
    embroidery: { enabled: false, incentive_price: "" },
    knitting: { enabled: false, incentive_price: "" },
    lasser_cutting: { enabled: false, incentive_price: "" }
  });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [sizeBase, setSizeBase] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingColor, setPendingColor] = useState("#33ccff");


  useEffect(() => {
    if (jobType) {
      setFormData({
        category_id: jobType.category_id?.toString() || jobType.category_id || "",
        name: jobType.name || "",
        description: jobType.description || "",
        price: jobType.price || "",
        price_by: jobType.price_by || "pcs",
        discount: jobType.discount || "",
        is_active: jobType.is_active !== undefined ? jobType.is_active : true,
        show_in_dashboard: jobType.show_in_dashboard !== undefined ? jobType.show_in_dashboard : true,
        show_in_customer_view: jobType.show_in_customer_view !== undefined ? jobType.show_in_customer_view : true,
        sort_order: jobType.sort_order || 0,
        brochure_link: jobType.brochure_link || "",
        has_colors: !!jobType.has_colors,
        available_colors: jobType.available_colors || []
      });
      setPriceTiers(
        (jobType.price_tiers || []).map((tier) => ({
          id: tier.id || null,
          label: tier.label || "",
          min_quantity: tier.min_quantity?.toString() || "",
          max_quantity: tier.max_quantity?.toString() || "",
          price: tier.price?.toString() || "",
          notes: tier.notes || ""
        }))
      );
      setSizeRates(
        (jobType.size_rates || []).map((rate) => ({
          id: rate.id || null,
          variant_name: rate.variant_name || "",
          description: rate.description || "",
          calculation_method: rate.calculation_method || "area",
          dimension_unit: rate.dimension_unit || "ft",
          rate: rate.rate?.toString() || "",
          min_width: rate.min_width?.toString() || "",
          max_width: rate.max_width?.toString() || "",
          min_height: rate.min_height?.toString() || "",
          max_height: rate.max_height?.toString() || "",
          is_default: !!rate.is_default
        }))
      );
      setPromoRules(
        (jobType.promo_rules || []).map((rule) => ({
          id: rule.id || null,
          buy_quantity: rule.buy_quantity?.toString() || "",
          free_quantity: rule.free_quantity?.toString() || "",
          description: rule.description || "",
          is_active: rule.is_active !== undefined ? rule.is_active : true
        }))
      );


      if (jobType.workflow_steps) {
        const steps = {
          printing: { enabled: false, incentive_price: "" },
          lamination_heatpress: { enabled: false, incentive_price: "" },
          cutting: { enabled: false, incentive_price: "" },
          sewing: { enabled: false, incentive_price: "" },
          dtf_press: { enabled: false, incentive_price: "" },
          embroidery: { enabled: false, incentive_price: "" },
          knitting: { enabled: false, incentive_price: "" },
          lasser_cutting: { enabled: false, incentive_price: "" }
        };

        Object.keys(steps).forEach((step) => {
          const data = jobType.workflow_steps[step];
          if (data) {
            if (typeof data === 'object' && data !== null) {
              steps[step] = {
                enabled: !!data.enabled,
                incentive_price: data.incentive_price || ""
              };
            } else {

              steps[step] = {
                enabled: !!data,
                incentive_price: data ? jobType.incentive_price || "" : ""
              };
            }
          }
        });
        setWorkflowSteps(steps);
      } else {
        setWorkflowSteps({
          printing: { enabled: false, incentive_price: "" },
          lamination_heatpress: { enabled: false, incentive_price: "" },
          cutting: { enabled: false, incentive_price: "" },
          sewing: { enabled: false, incentive_price: "" },
          dtf_press: { enabled: false, incentive_price: "" },
          embroidery: { enabled: false, incentive_price: "" },
          knitting: { enabled: false, incentive_price: "" },
          lasser_cutting: { enabled: false, incentive_price: "" }
        });
      }
      if (jobType && jobType.image_path) {
        setImagePreview(jobType.image_path);
      } else {
        setImagePreview(null);
      }
      setImageFile(null);
    } else {
      setPriceTiers([]);
      setSizeRates([]);
      setPromoRules([]);
      setWorkflowSteps({
        printing: { enabled: false, incentive_price: "" },
        lamination_heatpress: { enabled: false, incentive_price: "" },
        cutting: { enabled: false, incentive_price: "" },
        sewing: { enabled: false, incentive_price: "" },
        dtf_press: { enabled: false, incentive_price: "" },
        embroidery: { enabled: false, incentive_price: "" },
        knitting: { enabled: false, incentive_price: "" },
        lasser_cutting: { enabled: false, incentive_price: "" }
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [jobType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));


    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWorkflowChange = (step) => {
    setWorkflowSteps((prev) => ({
      ...prev,
      [step]: {
        ...prev[step],
        enabled: !prev[step].enabled
      }
    }));
  };

  const handleWorkflowIncentiveChange = (step, value) => {
    setWorkflowSteps((prev) => ({
      ...prev,
      [step]: {
        ...prev[step],
        incentive_price: value
      }
    }));
  };

  const addPriceTier = () => {
    setPriceTiers((prev) => [
      ...prev,
      {
        label: "",
        min_quantity: "",
        max_quantity: "",
        price: "",
        notes: ""
      }]
    );
  };

  const updatePriceTier = (index, field, value) => {
    setPriceTiers((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const removePriceTier = (index) => {
    setPriceTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const addSizeRate = () => {
    setSizeRates((prev) => [
      ...prev,
      {
        variant_name: "",
        description: "",
        calculation_method: "area",
        dimension_unit: "ft",
        rate: "",
        min_width: "",
        max_width: "",
        min_height: "",
        max_height: "",
        is_default: prev.length === 0
      }]
    );
  };

  const updateSizeRate = (index, field, value) => {
    setSizeRates((prev) => {
      const updated = [...prev];
      let newValue = value;

      if (field === "is_default") {
        updated.forEach((rate, idx) => {
          updated[idx] = { ...rate, is_default: idx === index };
        });
      } else {
        updated[index] = {
          ...updated[index],
          [field]: newValue
        };
      }

      return updated;
    });
  };

  const removeSizeRate = (index) => {
    setSizeRates((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((rate) => rate.is_default)) {
        updated[0].is_default = true;
      }
      return updated;
    });
  };

  const addPromoRule = () => {
    setPromoRules((prev) => [
      ...prev,
      {
        buy_quantity: "",
        free_quantity: "",
        description: "",
        is_active: true
      }]
    );
  };

  const updatePromoRule = (index, field, value) => {
    setPromoRules((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const removePromoRule = (index) => {
    setPromoRules((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.category_id) {
      newErrors.category_id = "Category is required";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Job type name is required";
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = "Price must be a valid positive number";
    }

    if (formData.discount && (parseFloat(formData.discount) < 0 || parseFloat(formData.discount) > 100)) {
      newErrors.discount = "Discount must be between 0 and 100";
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


    const formattedPriceTiers = priceTiers.
      filter((tier) => tier.min_quantity && tier.price).
      map((tier) => ({
        label: tier.label || null,
        min_quantity: Number(tier.min_quantity),
        max_quantity: tier.max_quantity ? Number(tier.max_quantity) : null,
        price: Number(tier.price),
        notes: tier.notes || null
      }));

    const formattedSizeRates = sizeRates.
      filter((rate) => rate.rate).
      map((rate) => ({
        variant_name: rate.variant_name || null,
        description: rate.description || null,
        calculation_method: rate.calculation_method || "area",
        dimension_unit: rate.dimension_unit || "ft",
        rate: Number(rate.rate),
        min_width: rate.min_width ? Number(rate.min_width) : null,
        max_width: rate.max_width ? Number(rate.max_width) : null,
        min_height: rate.min_height ? Number(rate.min_height) : null,
        max_height: rate.max_height ? Number(rate.max_height) : null,
        is_default: !!rate.is_default
      }));

    const formattedPromoRules = promoRules.
      filter((rule) => rule.buy_quantity && rule.free_quantity).
      map((rule) => ({
        buy_quantity: Number(rule.buy_quantity),
        free_quantity: Number(rule.free_quantity),
        description: rule.description || null,
        is_active: rule.is_active !== undefined ? rule.is_active : true
      }));

    const submitData = {
      ...formData,
      category_id: parseInt(formData.category_id),
      price: parseFloat(formData.price),
      discount: formData.discount ? parseFloat(formData.discount) : null,
      sort_order: parseInt(formData.sort_order) || 0,
      price_tiers: formattedPriceTiers,
      size_rates: formattedSizeRates,
      promo_rules: formattedPromoRules,
      workflow_steps: workflowSteps,
      image: imageFile,
      brochure_link: formData.brochure_link,
      has_colors: formData.has_colors,
      available_colors: formData.available_colors
    };

    onSubmit(submitData);

    setTimeout(() => {
      setProcessing(false);
    }, 1000);
  };

  const priceByOptions = [
    { value: "pcs", label: "Per Piece (pcs)" },
    { value: "sqm", label: "Per Square Meter (sqm)" },
    { value: "length", label: "Per Length" },
    { value: "kg", label: "Per Kilogram (kg)" }
  ];


  const categoryOptions = allcategories.map((cat) => ({
    value: cat.id.toString(),
    label: cat.name
  }));

  return (
    <form onSubmit={handleSubmit}>
      <div className="row justify-end">
        <div className="flex items-center gap-2">

          {/* STATUS */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              Status :
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>

          {/* DIVIDER */}
          <span className="h-6 w-px bg-gray-300" />

          {/* VISIBILITY & FEATURES */}
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="show_in_dashboard"
                checked={formData.show_in_dashboard}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Dashboard</span>
            </label>
            <span className="h-6 w-px bg-gray-300" />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="show_in_customer_view"
                checked={formData.show_in_customer_view}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Customer View</span>
            </label>
            <span className="h-6 w-px bg-gray-300" />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="has_colors"
                checked={formData.has_colors}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Enable Colors</span>
            </label>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <FormInput
            label="Category"
            type="select"
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            error={errors.category_id}
            options={categoryOptions}
            required />

        </div>

        <div className="col-md-6">
          <FormInput
            label="Job Type Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="e.g., MUG,BASKET BALL JERSEY (SET), Tarpaulin"
            required />

        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <FormInput
            label="Description (Optional)"
            type="textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            placeholder="Enter description (optional)"
            rows={3} />
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <FormInput
            label="Google Drive Brochure Link (Optional)"
            name="brochure_link"
            value={formData.brochure_link}
            onChange={handleChange}
            error={errors.brochure_link}
            placeholder="https://drive.google.com/..." />
        </div>
      </div>

      {
        formData.has_colors && (
          <div className="mt-4 p-4 bg-light rounded border">
            <h6 className="mb-3 font-weight-bold text-dark">Available Colors</h6>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-2">
                <input
                  type="color"
                  className="form-control form-control-sm p-0 border-none cursor-pointer"
                  style={{ width: '32px', height: '32px' }}
                  id="newColorPicker"
                  value={pendingColor}
                  onChange={(e) => setPendingColor(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    const color = pendingColor;
                    const exists = formData.available_colors.some(c =>
                      (typeof c === 'string' ? c === color : c.hex === color)
                    );
                    if (color && !exists) {
                      setFormData(prev => ({
                        ...prev,
                        available_colors: [...prev.available_colors, { hex: color, code: '' }]
                      }));
                    }
                  }}
                >
                  Okay
                </button>
              </div>

              <div className="d-flex flex-wrap gap-2 w-100">
                {formData.available_colors.map((colorObj, idx) => {
                  const hex = typeof colorObj === 'string' ? colorObj : colorObj.hex;
                  const code = typeof colorObj === 'string' ? '' : colorObj.code;

                  return (
                    <div key={idx} className="d-flex align-items-center gap-2 p-1 bg-white rounded border shadow-sm" style={{ width: 'fit-content', minWidth: '120px' }}>
                      <div
                        className="rounded-circle border"
                        style={{ width: '18px', height: '18px', backgroundColor: hex, flexShrink: 0 }}
                        title={hex}
                      ></div>

                      <input
                        type="text"
                        className="form-control form-control-xs border-0 bg-light px-2"
                        style={{ fontSize: '10px', height: '22px', width: '70px' }}
                        placeholder="Code"
                        value={code}
                        onChange={(e) => {
                          const newColors = [...formData.available_colors];
                          if (typeof newColors[idx] === 'string') {
                            newColors[idx] = { hex: newColors[idx], code: e.target.value };
                          } else {
                            newColors[idx] = { ...newColors[idx], code: e.target.value };
                          }
                          setFormData(prev => ({ ...prev, available_colors: newColors }));
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            available_colors: prev.available_colors.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-danger border-0 bg-transparent p-0 px-1 font-weight-bold"
                        style={{ fontSize: '16px', lineHeight: '1' }}
                        title="Remove"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}
                {formData.available_colors.length === 0 && (
                  <span className="text-muted italic text-xs">No colors added yet.</span>
                )}
              </div>
            </div>
          </div>
        )
      }

      <div className="row">
        <div className="col-md-4">
          <FormInput
            label="Base Price"
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            error={errors.price}
            placeholder="0.00"
            required
            step="0.01"
            min="0" />

        </div>
        <div className="col-md-4">
          <FormInput
            label="Price By"
            type="select"
            name="price_by"
            value={formData.price_by}
            onChange={handleChange}
            error={errors.price_by}
            options={priceByOptions}
            required />

        </div>
        <div className="col-md-4">
          <FormInput
            label="Discount (%)"
            type="number"
            name="discount"
            value={formData.discount}
            onChange={handleChange}
            error={errors.discount}
            placeholder="0"
            step="0.01"
            min="0"
            max="100" />

        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Image (Optional)
            </label>
            <div className="d-flex align-items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="form-control form-control-sm" />

              {imagePreview &&
                <div className="image-preview" style={{ width: '80px', height: '80px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {

                      e.target.onerror = null;
                      e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='12' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E`;
                    }} />

                </div>
              }
            </div>
            {errors.image && <p className="text-danger text-xs mt-1">{errors.image}</p>}
          </div>
        </div>
      </div>

      {/* <div className="row">
           <div className="col-md-6">
               <FormInput
                   label="Sort Order"
                   type="number"
                   name="sort_order"
                   value={formData.sort_order}
                   onChange={handleChange}
                   error={errors.sort_order}
                   placeholder="0"
                   min="0"
               />
           </div>
        </div> */}

      <div class="flex space-x-4">
        <label class="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200">
          <input type="radio" name="role" value="FrontDesk" class="h-4 w-4 text-indigo-600"
            checked={!sizeBase}
            onChange={() => setSizeBase(false)} />

          <span>Quantity Base</span>
        </label>

        <label class="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200">
          <input type="radio" name="role" value="Designer" class="h-4 w-4 text-indigo-600"
            checked={sizeBase}
            onChange={() => setSizeBase(true)} />

          <span>Size Base</span>
        </label>
      </div>


      {
        sizeBase ?
          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Size Based Pricing (Optional)</h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addSizeRate}>

                <i className="ti-plus"></i> Add Size Rate
              </button>
            </div>
            <p className="text-muted text-sm mb-3">
              Define rates per size or area (useful for Tarpaulins, Panaflex, etc.). If present, ticket pricing will use these rates.
            </p>

            {sizeRates.length > 0 ?
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>Method</th>
                      <th>Unit</th>
                      <th>Rate</th>
                      <th>Size Limits (W / H)</th>
                      <th>Default</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeRates.map((rate, index) =>
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm mb-2"
                            value={rate.variant_name}
                            onChange={(e) => updateSizeRate(index, "variant_name", e.target.value)}
                            placeholder="e.g., Ready to Print" />

                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={rate.description}
                            onChange={(e) => updateSizeRate(index, "description", e.target.value)}
                            placeholder="Optional description" />

                        </td>
                        <td>
                          <select
                            className="form-control form-control-sm"
                            value={rate.calculation_method}
                            onChange={(e) => updateSizeRate(index, "calculation_method", e.target.value)}>

                            <option value="area">Area (W x H)</option>
                            <option value="length">Length Only</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-control form-control-sm"
                            value={rate.dimension_unit}
                            onChange={(e) => updateSizeRate(index, "dimension_unit", e.target.value)}>

                            <option value="ft">Feet</option>
                            <option value="m">Meters</option>
                            <option value="cm">Centimeters</option>
                            <option value="in">Inches</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={rate.rate}
                            onChange={(e) => updateSizeRate(index, "rate", e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="Rate" />

                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={rate.min_width}
                              onChange={(e) => updateSizeRate(index, "min_width", e.target.value)}
                              min="0"
                              step="0.01"
                              placeholder="Min W" />

                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={rate.min_height}
                              onChange={(e) => updateSizeRate(index, "min_height", e.target.value)}
                              min="0"
                              step="0.01"
                              placeholder="Min H" />

                          </div>
                          <div className="d-flex gap-2 mt-2">
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={rate.max_width}
                              onChange={(e) => updateSizeRate(index, "max_width", e.target.value)}
                              min="0"
                              step="0.01"
                              placeholder="Max W" />

                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={rate.max_height}
                              onChange={(e) => updateSizeRate(index, "max_height", e.target.value)}
                              min="0"
                              step="0.01"
                              placeholder="Max H" />

                          </div>
                        </td>
                        <td className="text-center">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="default_rate"
                              checked={rate.is_default}
                              onChange={() => updateSizeRate(index, "is_default", true)} />

                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger"
                            onClick={() => removeSizeRate(index)}>

                            <i className="ti-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div> :

              <div className="alert text-warning">
                No size rates configured. Base price will be used.
              </div>
            }
          </div> :

          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Quantity Based Pricing (Optional) </h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addPriceTier}>

                <i className="ti-plus"></i> Add Tier
              </button>
            </div>
            <p className="text-muted text-sm mb-3">
              Use tiers to offer bulk discounts. Leave empty to use base price.
            </p>
            {priceTiers.length > 0 ?
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Min Qty</th>
                      <th>Max Qty</th>
                      <th>Price (per unit)</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceTiers.map((tier, index) =>
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={tier.label}
                            onChange={(e) => updatePriceTier(index, "label", e.target.value)}
                            placeholder="e.g., Retail" />

                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={tier.min_quantity}
                            onChange={(e) => updatePriceTier(index, "min_quantity", e.target.value)}
                            min="1"
                            placeholder="1" />

                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={tier.max_quantity}
                            onChange={(e) => updatePriceTier(index, "max_quantity", e.target.value)}
                            min="1"
                            placeholder="Optional" />

                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={tier.price}
                            onChange={(e) => updatePriceTier(index, "price", e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="0.00" />

                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={tier.notes}
                            onChange={(e) => updatePriceTier(index, "notes", e.target.value)}
                            placeholder="Optional notes" />

                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger"
                            onClick={() => removePriceTier(index)}>

                            <i className="ti-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div> :

              <div className="alert text-warning">
                No quantity tiers added yet.
              </div>
            }
          </div>

      }




      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">Promotional Rules (Optional)</h5>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={addPromoRule}>

            <i className="ti-gift"></i> Add Promo
          </button>
        </div>
        <p className="text-muted text-sm mb-3">
          Define promotional offers like "Buy 12, Get 1 Free" for bulk purchases.
        </p>

        {promoRules.length > 0 ?
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Buy Quantity</th>
                  <th>Free Quantity</th>
                  <th>Description</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {promoRules.map((rule, index) =>
                  <tr key={index}>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={rule.buy_quantity}
                        onChange={(e) => updatePromoRule(index, "buy_quantity", e.target.value)}
                        min="1"
                        placeholder="e.g., 12" />

                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={rule.free_quantity}
                        onChange={(e) => updatePromoRule(index, "free_quantity", e.target.value)}
                        min="1"
                        placeholder="e.g., 1" />

                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={rule.description}
                        onChange={(e) => updatePromoRule(index, "description", e.target.value)}
                        placeholder="e.g., Buy 12, Get 1 Free!" />

                    </td>
                    <td className="text-center">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={rule.is_active}
                          onChange={(e) => updatePromoRule(index, "is_active", e.target.checked)} />

                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger"
                        onClick={() => removePromoRule(index)}>

                        <i className="ti-trash"></i>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div> :

          <div className="alert text-warning">
            No promotional rules added yet.
          </div>
        }
      </div>

      <hr />
      <div className="mt-4">
        <h5 className="mb-3">Production Workflow Template & Incentives</h5>
        <p className="text-muted text-sm mb-3">
          Select the production steps that apply to this job type. For each step, you can specify an incentive price per piece.
        </p>
        <div className="row">
          {[
            { key: 'printing', label: 'Printing', icon: 'ti-printer' },
            { key: 'lamination_heatpress', label: 'Lamination/Heatpress', icon: 'ti-layers' },
            { key: 'cutting', label: 'Cutting', icon: 'ti-cut' },
            { key: 'sewing', label: 'Sewing', icon: 'ti-pin-alt' },
            { key: 'dtf_press', label: 'DTF Press', icon: 'ti-stamp' },
            { key: 'embroidery', label: 'Embroidery', icon: 'ti-pencil-alt' },
            { key: 'knitting', label: 'Knitting', icon: 'ti-layout-grid2' },
            { key: 'lasser_cutting', label: 'Laser Cutting', icon: 'ti-bolt' }].
            map((step) =>
              <div key={step.key} className="col-md-4 mb-4">
                <div className="card h-100 p-3 bg-light border-dashed">
                  <div className="form-check custom-checkbox">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`workflow_${step.key}`}
                      checked={workflowSteps[step.key].enabled}
                      onChange={() => handleWorkflowChange(step.key)} />

                    <label className="form-check-label font-weight-bold" htmlFor={`workflow_${step.key}`}>
                      <i className={`${step.icon} mr-1`}></i> {step.label}
                    </label>
                  </div>
                  {workflowSteps[step.key].enabled &&
                    <div className="mt-2">
                      <div className="input-group input-group-sm">
                        <div className="input-group-prepend">
                          <span className="input-group-text">₱</span>
                        </div>
                        <input
                          type="number"
                          className="form-control"
                          value={workflowSteps[step.key].incentive_price}
                          onChange={(e) => handleWorkflowIncentiveChange(step.key, e.target.value)}
                          placeholder="Incentive"
                          step="0.01"
                          min="0" />

                        <div className="input-group-append">
                          <span className="input-group-text">/pcs</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            )}
        </div>
      </div>

      <div className="mt-4 p-4 bg-light rounded border">
        <h6 className="mb-3 font-weight-bold text-dark">Workflow Preview & Incentives</h6>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {Object.entries(workflowSteps).
            filter(([key, data]) => data.enabled).
            sort((a, b) => {
              const order = ['printing', 'lamination_heatpress', 'cutting', 'sewing', 'dtf_press'];
              return order.indexOf(a[0]) - order.indexOf(b[0]);
            }).
            map(([key, data], index, array) =>
              <React.Fragment key={key}>
                <div className="d-flex align-items-center">
                  <div className="d-flex flex-column align-items-center">
                    <div className="badge badge-primary p-2 px-3 rounded-pill shadow-sm" style={{ fontSize: '0.9rem' }}>
                      {key === 'lamination_heatpress' ? 'Lamination/Heatpress' :
                        key === 'dtf_press' ? 'DTF Press' :
                          key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                    </div>
                    {data.incentive_price > 0 &&
                      <span className="text-success text-xs font-weight-bold mt-1">
                        ₱{data.incentive_price}
                      </span>
                    }
                  </div>
                  {index < array.length - 1 &&
                    <i className="ti-arrow-right mx-2 text-muted font-weight-bold"></i>
                  }
                </div>
              </React.Fragment>
            )}

          {/* Visual connector to Completed if any steps are selected */}
          {Object.values(workflowSteps).some((v) => v.enabled) &&
            <>
              <i className="ti-arrow-right mx-2 text-muted font-weight-bold"></i>
              <div className="badge badge-success p-2 px-3 rounded-pill shadow-sm" style={{ fontSize: '0.9rem' }}>
                Completed
              </div>
            </>
          }

          {!Object.values(workflowSteps).some((v) => v.enabled) &&
            <span className="text-muted font-italic">Select steps above to see the workflow preview.</span>
          }
        </div>
      </div>

      <div className="mt-4 d-flex justify-content-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition">

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
              <i className="ti-save mr-2"></i> {jobType ? "Update" : "Save"}
            </span>
          }
        </button>
      </div>
    </form >);

}