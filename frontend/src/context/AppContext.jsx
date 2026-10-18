import React, { createContext, useReducer, useEffect } from 'react';
import api from '../api/api';

// Initial state
const initialState = {
  properties: [],
  apartments: [],
  tenants: [],
  loading: false,
  error: null,
};

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_PROPERTIES: 'SET_PROPERTIES',
  SET_APARTMENTS: 'SET_APARTMENTS',
  SET_TENANTS: 'SET_TENANTS',
  ADD_PROPERTY: 'ADD_PROPERTY',
  UPDATE_PROPERTY: 'UPDATE_PROPERTY',
  DELETE_PROPERTY: 'DELETE_PROPERTY',
  ADD_APARTMENT: 'ADD_APARTMENT',
  UPDATE_APARTMENT: 'UPDATE_APARTMENT',
  DELETE_APARTMENT: 'DELETE_APARTMENT',
  ADD_TENANT: 'ADD_TENANT',
  UPDATE_TENANT: 'UPDATE_TENANT',
  DELETE_TENANT: 'DELETE_TENANT',
};

// Reducer function
function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.SET_PROPERTIES:
      return { ...state, properties: action.payload };
    case ACTIONS.SET_APARTMENTS:
      return { ...state, apartments: action.payload };
    case ACTIONS.SET_TENANTS:
      return { ...state, tenants: action.payload };
    case ACTIONS.ADD_PROPERTY:
      return { ...state, properties: [...state.properties, action.payload] };
    case ACTIONS.UPDATE_PROPERTY:
      return {
        ...state,
        properties: state.properties.map((p) => (p._id === action.payload._id ? action.payload : p)),
      };
    case ACTIONS.DELETE_PROPERTY:
      return { ...state, properties: state.properties.filter((p) => p._id !== action.payload) };
    case ACTIONS.ADD_APARTMENT:
      return { ...state, apartments: [...state.apartments, action.payload] };
    case ACTIONS.UPDATE_APARTMENT:
      return {
        ...state,
        apartments: state.apartments.map((a) => (a._id === action.payload._id ? action.payload : a)),
      };
    case ACTIONS.DELETE_APARTMENT:
      return { ...state, apartments: state.apartments.filter((a) => a._id !== action.payload) };
    case ACTIONS.ADD_TENANT:
      return { ...state, tenants: [...state.tenants, action.payload] };
    case ACTIONS.UPDATE_TENANT:
      return {
        ...state,
        tenants: state.tenants.map((t) => (t._id === action.payload._id ? action.payload : t)),
      };
    case ACTIONS.DELETE_TENANT:
      return { ...state, tenants: state.tenants.filter((t) => t._id !== action.payload) };
    default:
      return state;
  }
}

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load initial data
  useEffect(() => {
    const fetchAll = async () => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      try {
        const [propsRes, aptsRes, tenantsRes] = await Promise.all([
          api.get('/properties'),
          api.get('/apartments'),
          api.get('/tenants'),
        ]);
        dispatch({ type: ACTIONS.SET_PROPERTIES, payload: propsRes.data });
        dispatch({ type: ACTIONS.SET_APARTMENTS, payload: aptsRes.data });
        dispatch({ type: ACTIONS.SET_TENANTS, payload: tenantsRes.data });
      } catch (err) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
      } finally {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    };
    fetchAll();
  }, []);

  // CRUD helpers – each returns the created/updated entity for further use
  const addProperty = async (data) => {
    const res = await api.post('/properties', data);
    dispatch({ type: ACTIONS.ADD_PROPERTY, payload: res.data });
    return res.data;
  };

  const updateProperty = async (id, data) => {
    const res = await api.put(`/properties/${id}`, data);
    dispatch({ type: ACTIONS.UPDATE_PROPERTY, payload: res.data });
    return res.data;
  };

  const deleteProperty = async (id) => {
    await api.delete(`/properties/${id}`);
    dispatch({ type: ACTIONS.DELETE_PROPERTY, payload: id });
  };

  const addApartment = async (data) => {
    const res = await api.post('/apartments', data);
    dispatch({ type: ACTIONS.ADD_APARTMENT, payload: res.data });
    return res.data;
  };

  const updateApartment = async (id, data) => {
    const res = await api.put(`/apartments/${id}`, data);
    dispatch({ type: ACTIONS.UPDATE_APARTMENT, payload: res.data });
    return res.data;
  };

  const deleteApartment = async (id) => {
    await api.delete(`/apartments/${id}`);
    dispatch({ type: ACTIONS.DELETE_APARTMENT, payload: id });
  };

  const addTenant = async (data) => {
    const res = await api.post('/tenants', data);
    dispatch({ type: ACTIONS.ADD_TENANT, payload: res.data });
    return res.data;
  };

  const updateTenant = async (id, data) => {
    const res = await api.put(`/tenants/${id}`, data);
    dispatch({ type: ACTIONS.UPDATE_TENANT, payload: res.data });
    return res.data;
  };

  const deleteTenant = async (id) => {
    await api.delete(`/tenants/${id}`);
    dispatch({ type: ACTIONS.DELETE_TENANT, payload: id });
  };

  const value = {
    state,
    dispatch,
    addProperty,
    updateProperty,
    deleteProperty,
    addApartment,
    updateApartment,
    deleteApartment,
    addTenant,
    updateTenant,
    deleteTenant,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
