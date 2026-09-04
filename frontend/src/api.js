import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://smart-stock-six-self.vercel.app/api'
});

export default API;
