"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';
import '../account/account.css';
import './journal.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, BookOpen, LogOut, Edit, Trash2, User, BarChart3, Newspaper, Users, CheckSquare, Square, X, Settings } from 'lucide-react';
import { MobileNav } from '@/components/ui/mobile-nav';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Trade {
  id: string;
  date: string;
  pair: string;
  position: 'Long' | 'Short';
  pnl_amount: number | null;
  notes: string;
  trading_account_id: string;
  setup_id: string | null;
  image_url: string | null;
}

interface Setup {
  id: string;
  name: string;
  user_id: string;
}

interface ChecklistTemplate {
  id: string;
  setup_id: string;
  text: string;
  order_index: number;
}

interface TradeChecklist {
  id: string;
  trade_id: string;
  text: string;
  is_checked: boolean;
  order_index: number;
}

interface TradingAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface UserProfile {
  username: string;
}

export default function JournalPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isLoaded } = useTheme();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [setups, setSetups] = useState<Setup[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<{ [setupId: string]: ChecklistTemplate[] }>({});
  const [tradeChecklists, setTradeChecklists] = useState<{ [tradeId: string]: TradeChecklist[] }>({});

  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [isEditingTrade, setIsEditingTrade] = useState(false);
  const [isManagingSetups, setIsManagingSetups] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Setup management state
  const [newSetupName, setNewSetupName] = useState('');
  const [editingSetupId, setEditingSetupId] = useState<string | null>(null);
  const [editingSetupName, setEditingSetupName] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState<{ [setupId: string]: string }>({});

  const [newTrade, setNewTrade] = useState({
    date: new Date().toISOString().split('T')[0],
    pair: '',
    position: 'Long' as 'Long' | 'Short',
    pnl_amount: '',
    notes: '',
    trading_account_id: '',
    setup_id: 'NO_SETUP'
  });

  const [editTrade, setEditTrade] = useState({
    date: '',
    pair: '',
    position: 'Long' as 'Long' | 'Short',
    pnl_amount: '',
    notes: '',
    trading_account_id: '',
    setup_id: 'NO_SETUP'
  });

  // Temporary checklists for new trade
  const [tempTradeChecklists, setTempTradeChecklists] = useState<{ text: string; is_checked: boolean }[]>([]);

  // Image upload state
  const [newTradeImage, setNewTradeImage] = useState<File | null>(null);
  const [newTradeImagePreview, setNewTradeImagePreview] = useState<string | null>(null);
  const [editTradeImage, setEditTradeImage] = useState<File | null>(null);
  const [editTradeImagePreview, setEditTradeImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return (
      <div className="loading-container theme-dark">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const savedAccount = localStorage.getItem('selectedTradingAccount');
    if (savedAccount && accounts.length > 0) {
      const accountExists = accounts.find(acc => acc.id === savedAccount);
      if (accountExists) {
        setSelectedAccount(savedAccount);
        setNewTrade(prev => ({ ...prev, trading_account_id: savedAccount }));
        loadTrades(savedAccount);
      } else {
        if (accounts.length > 0) {
          const firstAccountId = accounts[0].id;
          setSelectedAccount(firstAccountId);
          setNewTrade(prev => ({ ...prev, trading_account_id: firstAccountId }));
          localStorage.setItem('selectedTradingAccount', firstAccountId);
          loadTrades(firstAccountId);
        }
      }
    } else if (accounts.length > 0 && !selectedAccount) {
      const firstAccountId = accounts[0].id;
      setSelectedAccount(firstAccountId);
      setNewTrade(prev => ({ ...prev, trading_account_id: firstAccountId }));
      localStorage.setItem('selectedTradingAccount', firstAccountId);
      loadTrades(firstAccountId);
    }
  }, [accounts]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Error loading profile');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: accountsData, error: accountsError } = await supabase
        .from('trading_accounts')
        .select('id, name, current_balance')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('Error loading trading accounts:', accountsError);
      } else {
        setAccounts(accountsData || []);
        if (accountsData && accountsData.length > 0) {
          setSelectedAccount(accountsData[0].id);
          setNewTrade(prev => ({ ...prev, trading_account_id: accountsData[0].id }));
          loadTrades(accountsData[0].id);
        }
      }

      // Load setups
      await loadSetups(user.id);

      setLoading(false);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const loadSetups = async (userId: string) => {
    try {
      const { data: setupsData, error: setupsError } = await supabase
        .from('setups')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (setupsError) {
        console.error('Error loading setups:', setupsError);
        return;
      }

      setSetups(setupsData || []);

      // Load checklist templates for each setup
      const { data: templatesData, error: templatesError } = await supabase
        .from('setup_checklist_templates')
        .select('*')
        .order('order_index', { ascending: true });

      if (templatesError) {
        console.error('Error loading checklist templates:', templatesError);
        return;
      }

      // Group templates by setup_id
      const grouped: { [setupId: string]: ChecklistTemplate[] } = {};
      templatesData?.forEach(template => {
        if (!grouped[template.setup_id]) {
          grouped[template.setup_id] = [];
        }
        grouped[template.setup_id].push(template);
      });

      setChecklistTemplates(grouped);
    } catch (err) {
      console.error('Error loading setups:', err);
    }
  };

  const loadTrades = async (accountId: string) => {
    try {
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('trading_account_id', accountId)
        .order('date', { ascending: false });

      if (tradesError) {
        console.error('Error loading trades:', tradesError);
      } else {
        setTrades(tradesData || []);

        // Load checklists for all trades
        const tradeIds = tradesData?.map(t => t.id) || [];
        if (tradeIds.length > 0) {
          const { data: checklistsData, error: checklistsError } = await supabase
            .from('trade_checklists')
            .select('*')
            .in('trade_id', tradeIds)
            .order('order_index', { ascending: true });

          if (checklistsError) {
            console.error('Error loading trade checklists:', checklistsError);
          } else {
            // Group checklists by trade_id
            const grouped: { [tradeId: string]: TradeChecklist[] } = {};
            checklistsData?.forEach(checklist => {
              if (!grouped[checklist.trade_id]) {
                grouped[checklist.trade_id] = [];
              }
              grouped[checklist.trade_id].push(checklist);
            });
            setTradeChecklists(grouped);
          }
        }
      }
    } catch (err) {
      console.error('Error loading trades:', err);
    }
  };

  const handleAddSetup = async () => {
    if (!newSetupName.trim()) {
      setError('Setup name is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('setups')
        .insert({ user_id: user.id, name: newSetupName.trim() })
        .select();

      if (error) {
        setError(`Error creating setup: ${error.message}`);
        return;
      }

      setSetups([...setups, data[0]]);
      setNewSetupName('');
      setError('');
    } catch (err) {
      setError('Error creating setup');
    }
  };

  const handleDeleteSetup = async (setupId: string) => {
    try {
      const { error } = await supabase
        .from('setups')
        .delete()
        .eq('id', setupId);

      if (error) {
        setError(`Error deleting setup: ${error.message}`);
        return;
      }

      setSetups(setups.filter(s => s.id !== setupId));
      delete checklistTemplates[setupId];
      setChecklistTemplates({ ...checklistTemplates });
    } catch (err) {
      setError('Error deleting setup');
    }
  };

  const handleAddChecklistTemplate = async (setupId: string) => {
    const text = newChecklistItem[setupId];
    if (!text?.trim()) {
      return;
    }

    try {
      const currentTemplates = checklistTemplates[setupId] || [];
      const orderIndex = currentTemplates.length;

      const { data, error } = await supabase
        .from('setup_checklist_templates')
        .insert({
          setup_id: setupId,
          text: text.trim(),
          order_index: orderIndex
        })
        .select();

      if (error) {
        setError(`Error adding checklist item: ${error.message}`);
        return;
      }

      setChecklistTemplates({
        ...checklistTemplates,
        [setupId]: [...currentTemplates, data[0]]
      });

      setNewChecklistItem({ ...newChecklistItem, [setupId]: '' });
    } catch (err) {
      setError('Error adding checklist item');
    }
  };

  const handleDeleteChecklistTemplate = async (setupId: string, templateId: string) => {
    try {
      const { error } = await supabase
        .from('setup_checklist_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        setError(`Error deleting checklist item: ${error.message}`);
        return;
      }

      const updatedTemplates = checklistTemplates[setupId].filter(t => t.id !== templateId);
      setChecklistTemplates({
        ...checklistTemplates,
        [setupId]: updatedTemplates
      });
    } catch (err) {
      setError('Error deleting checklist item');
    }
  };

  const handleSetupChange = (setupId: string) => {
    setNewTrade({ ...newTrade, setup_id: setupId });

    // Load checklist templates for this setup (clear if NO_SETUP)
    if (setupId === 'NO_SETUP') {
      setTempTradeChecklists([]);
    } else {
      const templates = checklistTemplates[setupId] || [];
      setTempTradeChecklists(templates.map(t => ({
        text: t.text,
        is_checked: false
      })));
    }
  };

  // Handle image selection for new trade
  const handleNewTradeImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewTradeImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTradeImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image selection for edit trade
  const handleEditTradeImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditTradeImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditTradeImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image for new trade
  const handleRemoveNewTradeImage = () => {
    setNewTradeImage(null);
    setNewTradeImagePreview(null);
  };

  // Remove selected image for edit trade
  const handleRemoveEditTradeImage = () => {
    setEditTradeImage(null);
    setEditTradeImagePreview(null);
  };

  // Upload image to Supabase storage
  const uploadTradeImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('trade-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('trade-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (!selectedAccount) {
        setError('Please select a trading account');
        return;
      }

      if (!newTrade.pair) {
        setError('Please fill in all required fields');
        return;
      }

      let pnlAmount = newTrade.pnl_amount ? parseFloat(newTrade.pnl_amount) : null;

      if (newTrade.pnl_amount && isNaN(pnlAmount!)) {
        setError('Please enter a valid P&L amount');
        return;
      }

      // Upload image if one was selected
      let imageUrl: string | null = null;
      if (newTradeImage) {
        setUploadingImage(true);
        imageUrl = await uploadTradeImage(newTradeImage, user.id);
        setUploadingImage(false);

        if (!imageUrl) {
          setError('Failed to upload image. Please try again.');
          return;
        }
      }

      const tradeData = {
        user_id: user.id,
        trading_account_id: selectedAccount,
        date: newTrade.date,
        pair: newTrade.pair.toUpperCase().trim(),
        position: newTrade.position,
        pnl_amount: pnlAmount,
        notes: newTrade.notes.trim(),
        setup_id: (newTrade.setup_id && newTrade.setup_id !== 'NO_SETUP') ? newTrade.setup_id : null,
        image_url: imageUrl
      };

      const { data, error } = await supabase
        .from('trades')
        .insert(tradeData)
        .select();

      if (error) {
        setError(`Database error: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        setError('Trade was created but no data was returned. Please refresh the page.');
        loadTrades(selectedAccount);
        setIsAddingTrade(false);
        return;
      }

      const createdTrade = data[0];

      // Add checklists for this trade
      if (tempTradeChecklists.length > 0) {
        const checklistsToInsert = tempTradeChecklists.map((item, index) => ({
          trade_id: createdTrade.id,
          text: item.text,
          is_checked: item.is_checked,
          order_index: index
        }));

        const { data: checklistsData, error: checklistsError } = await supabase
          .from('trade_checklists')
          .insert(checklistsToInsert)
          .select();

        if (!checklistsError && checklistsData) {
          setTradeChecklists({
            ...tradeChecklists,
            [createdTrade.id]: checklistsData
          });
        }
      }

      // Update account balance if P&L amount is provided
      if (pnlAmount !== null && pnlAmount !== 0) {
        const { data: freshAccount, error: freshAccountError } = await supabase
          .from('trading_accounts')
          .select('current_balance')
          .eq('id', selectedAccount)
          .eq('user_id', user.id)
          .single();

        if (freshAccountError) {
          setError('Trade created but failed to get current balance');
          return;
        }

        let currentBalance = 0;
        if (freshAccount?.current_balance !== null && freshAccount?.current_balance !== undefined) {
          currentBalance = Number(freshAccount.current_balance);
        }

        if (isNaN(currentBalance)) {
          currentBalance = 0;
        }

        const newBalance = currentBalance + pnlAmount;

        const { error: balanceError } = await supabase
          .from('trading_accounts')
          .update({ current_balance: newBalance })
          .eq('id', selectedAccount)
          .eq('user_id', user.id);

        if (balanceError) {
          setError('Trade created but failed to update account balance');
          return;
        }

        setAccounts(accounts.map(acc =>
          acc.id === selectedAccount
            ? { ...acc, current_balance: newBalance }
            : acc
        ));
      }

      setTrades([createdTrade, ...trades]);

      setNewTrade({
        date: new Date().toISOString().split('T')[0],
        pair: '',
        position: 'Long',
        pnl_amount: '',
        notes: '',
        trading_account_id: selectedAccount,
        setup_id: 'NO_SETUP'
      });
      setTempTradeChecklists([]);
      setNewTradeImage(null);
      setNewTradeImagePreview(null);
      setIsAddingTrade(false);

    } catch (err) {
      console.error('Error creating trade:', err);
      setError(`Error creating trade: ${err}`);
    }
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTradeId(trade.id);
    setEditTrade({
      date: trade.date,
      pair: trade.pair,
      position: trade.position,
      pnl_amount: trade.pnl_amount ? trade.pnl_amount.toString() : '',
      notes: trade.notes,
      trading_account_id: trade.trading_account_id,
      setup_id: trade.setup_id || 'NO_SETUP'
    });
    setIsEditingTrade(true);
  };

  const handleUpdateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingTradeId) {
      setError('No trade selected for editing');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (!editTrade.pair) {
        setError('Please fill in all required fields');
        return;
      }

      let pnlAmount = editTrade.pnl_amount ? parseFloat(editTrade.pnl_amount) : null;

      if (editTrade.pnl_amount && isNaN(pnlAmount!)) {
        setError('Please enter a valid P&L amount');
        return;
      }

      const originalTrade = trades.find(t => t.id === editingTradeId);
      if (!originalTrade) {
        setError('Original trade not found');
        return;
      }

      const updateData = {
        date: editTrade.date,
        pair: editTrade.pair.toUpperCase().trim(),
        position: editTrade.position,
        pnl_amount: pnlAmount,
        notes: editTrade.notes.trim(),
        setup_id: (editTrade.setup_id && editTrade.setup_id !== 'NO_SETUP') ? editTrade.setup_id : null
      };

      const { data, error } = await supabase
        .from('trades')
        .update(updateData)
        .eq('id', editingTradeId)
        .eq('user_id', user.id)
        .select();

      if (error) {
        setError(`Error updating trade: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        setError('Trade update failed - no data returned');
        return;
      }

      const updatedTrade = data[0];

      // Update account balance based on P&L difference
      const originalPnL = originalTrade.pnl_amount || 0;
      const newPnL = pnlAmount || 0;
      const pnlDifference = newPnL - originalPnL;

      if (pnlDifference !== 0) {
        const { data: freshAccount, error: freshAccountError } = await supabase
          .from('trading_accounts')
          .select('current_balance')
          .eq('id', editTrade.trading_account_id)
          .eq('user_id', user.id)
          .single();

        if (freshAccountError) {
          setError('Trade updated but failed to get current balance');
          return;
        }

        let currentBalance = 0;
        if (freshAccount?.current_balance !== null && freshAccount?.current_balance !== undefined) {
          currentBalance = Number(freshAccount.current_balance);
        }

        if (isNaN(currentBalance)) {
          currentBalance = 0;
        }

        const newBalance = currentBalance + pnlDifference;

        const { error: balanceError } = await supabase
          .from('trading_accounts')
          .update({ current_balance: newBalance })
          .eq('id', editTrade.trading_account_id)
          .eq('user_id', user.id);

        if (balanceError) {
          setError('Trade updated but failed to update account balance');
          return;
        }

        setAccounts(accounts.map(acc =>
          acc.id === editTrade.trading_account_id
            ? { ...acc, current_balance: newBalance }
            : acc
        ));
      }

      setTrades(trades.map(trade =>
        trade.id === editingTradeId ? updatedTrade : trade
      ));

      setEditTrade({
        date: '',
        pair: '',
        position: 'Long',
        pnl_amount: '',
        notes: '',
        trading_account_id: '',
        setup_id: 'NO_SETUP'
      });
      setEditingTradeId(null);
      setIsEditingTrade(false);

    } catch (err) {
      console.error('Error updating trade:', err);
      setError(`Error updating trade: ${err}`);
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const tradeToDelete = trades.find(t => t.id === tradeId);
      if (!tradeToDelete) {
        setError('Trade not found');
        return;
      }

      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId);

      if (error) {
        setError('Error deleting trade');
        return;
      }

      // Reverse the P&L impact on account balance
      const tradePnL = tradeToDelete.pnl_amount || 0;
      if (tradePnL !== 0) {
        const { data: freshAccount, error: freshAccountError } = await supabase
          .from('trading_accounts')
          .select('current_balance')
          .eq('id', tradeToDelete.trading_account_id)
          .eq('user_id', user.id)
          .single();

        if (freshAccountError) {
          setError('Trade deleted but failed to get current balance');
          return;
        }

        let currentBalance = 0;
        if (freshAccount?.current_balance !== null && freshAccount?.current_balance !== undefined) {
          currentBalance = Number(freshAccount.current_balance);
        }

        if (isNaN(currentBalance)) {
          currentBalance = 0;
        }

        const newBalance = currentBalance - tradePnL;

        const { error: balanceError } = await supabase
          .from('trading_accounts')
          .update({ current_balance: newBalance })
          .eq('id', tradeToDelete.trading_account_id)
          .eq('user_id', user.id);

        if (balanceError) {
          setError('Trade deleted but failed to update account balance');
          return;
        }

        setAccounts(accounts.map(acc =>
          acc.id === tradeToDelete.trading_account_id
            ? { ...acc, current_balance: newBalance }
            : acc
        ));
      }

      setTrades(trades.filter(trade => trade.id !== tradeId));
      delete tradeChecklists[tradeId];
      setTradeChecklists({ ...tradeChecklists });
    } catch (err) {
      setError('An error occurred while deleting the trade');
    }
  };

  const handleToggleChecklistItem = async (tradeId: string, checklistId: string) => {
    try {
      const checklist = tradeChecklists[tradeId]?.find(c => c.id === checklistId);
      if (!checklist) return;

      const { error } = await supabase
        .from('trade_checklists')
        .update({ is_checked: !checklist.is_checked })
        .eq('id', checklistId);

      if (error) {
        console.error('Error updating checklist:', error);
        return;
      }

      setTradeChecklists({
        ...tradeChecklists,
        [tradeId]: tradeChecklists[tradeId].map(c =>
          c.id === checklistId ? { ...c, is_checked: !c.is_checked } : c
        )
      });
    } catch (err) {
      console.error('Error toggling checklist:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getPnLClass = (trade: Trade) => {
    if (trade.pnl_amount === null) return '';
    return trade.pnl_amount >= 0 ? 'profit' : 'loss';
  };

  const getSelectedAccountBalance = () => {
    const account = accounts.find(acc => acc.id === selectedAccount);
    return account ? account.current_balance : 0;
  };

  const getSetupName = (setupId: string | null) => {
    if (!setupId) return '-';
    const setup = setups.find(s => s.id === setupId);
    return setup ? setup.name : '-';
  };

  if (loading) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <p className="error-text">Error loading profile</p>
          <Button onClick={() => router.push('/auth/login')} className="btn-primary mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`account-page ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      <nav className="nav-bar">
        <div className="nav-container">
          <div className="nav-content">
            <div className="nav-logo">
              <h1>TradeQuest</h1>
            </div>

            <div className="nav-tabs">
              <button
                onClick={() => router.push('/dashboard')}
                className="nav-tab"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <button className="nav-tab active">
                <BookOpen className="w-4 h-4" />
                Journal
              </button>
              <button
                onClick={() => router.push('/news')}
                className="nav-tab"
              >
                <Newspaper className="w-4 h-4" />
                News
              </button>
              <button
                onClick={() => router.push('/community')}
                className="nav-tab"
              >
                <Users className="w-4 h-4" />
                Community
              </button>
              <button
                onClick={() => router.push('/teams')}
                className="nav-tab"
              >
                <Users className="w-4 h-4" />
                Teams
              </button>
              <button
                onClick={() => router.push('/account')}
                className="nav-tab"
              >
                <User className="w-4 h-4" />
                Account
              </button>
            </div>

            <div className="nav-actions">
              <span className="nav-username">{userProfile.username}</span>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut className="w-4 h-4" />
                Logout
              </button>

              <MobileNav
                logo={<h1 style={{ color: 'var(--accent-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>TradeQuest</h1>}
                actions={
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{userProfile.username}</span>
                    </div>
                    <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', justifyContent: 'center' }}>
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                }
              >
                <div className="mobile-nav-items">
                  <button onClick={() => router.push('/dashboard')} className="mobile-nav-item">
                    <BarChart3 />
                    Dashboard
                  </button>
                  <button className="mobile-nav-item active">
                    <BookOpen />
                    Journal
                  </button>
                  <button onClick={() => router.push('/news')} className="mobile-nav-item">
                    <Newspaper />
                    News
                  </button>
                  <button onClick={() => router.push('/community')} className="mobile-nav-item">
                    <Users />
                    Community
                  </button>
                  <button onClick={() => router.push('/teams')} className="mobile-nav-item">
                    <Users />
                    Teams
                  </button>
                  <button onClick={() => router.push('/account')} className="mobile-nav-item">
                    <User />
                    Account
                  </button>
                </div>
              </MobileNav>
            </div>
          </div>
        </div>
      </nav>

      <div className="main-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="journal-header">
          <div>
            <h1 className="journal-title">Trade Journal</h1>
            {selectedAccount && (
              <p className="account-balance">
                Account Balance: USD{getSelectedAccountBalance().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div className="journal-actions">
            <Button onClick={() => setIsManagingSetups(true)} variant="outline" className="mr-2">
              <Settings className="w-4 h-4 mr-2" />
              Manage Setups
            </Button>

            <Dialog open={isAddingTrade} onOpenChange={setIsAddingTrade}>
              <DialogTrigger asChild>
                <button className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Add Trade
                </button>
              </DialogTrigger>
              <DialogContent className="trade-dialog">
                <DialogHeader>
                  <DialogTitle>Add New Trade</DialogTitle>
                  <DialogDescription>
                    Record your trading activity
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddTrade} className="trade-form">
                  <div className="form-row">
                    <div className="form-group">
                      <Label htmlFor="date" className="form-label">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newTrade.date}
                        onChange={(e) => setNewTrade({...newTrade, date: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <Label htmlFor="pair" className="form-label">Trading Pair</Label>
                      <Input
                        id="pair"
                        type="text"
                        placeholder="XAUUSD"
                        value={newTrade.pair}
                        onChange={(e) => setNewTrade({...newTrade, pair: e.target.value})}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <Label htmlFor="position" className="form-label">Position</Label>
                      <Select value={newTrade.position} onValueChange={(value: 'Long' | 'Short') => setNewTrade({...newTrade, position: value})}>
                        <SelectTrigger className="form-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Long">Long</SelectItem>
                          <SelectItem value="Short">Short</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="form-group">
                      <Label htmlFor="setup" className="form-label">Setup</Label>
                      <Select value={newTrade.setup_id} onValueChange={handleSetupChange}>
                        <SelectTrigger className="form-input">
                          <SelectValue placeholder="Select a setup" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NO_SETUP">None</SelectItem>
                          {setups.map(setup => (
                            <SelectItem key={setup.id} value={setup.id}>{setup.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="form-group">
                    <Label htmlFor="pnlAmount" className="form-label">P&L Amount (USD)</Label>
                    <Input
                      id="pnlAmount"
                      type="number"
                      step="0.01"
                      placeholder="Enter P&L amount (e.g., 150.50 or -75.25)"
                      value={newTrade.pnl_amount}
                      onChange={(e) => setNewTrade({...newTrade, pnl_amount: e.target.value})}
                      className="form-input"
                    />
                  </div>

                  {tempTradeChecklists.length > 0 && (
                    <div className="form-group">
                      <Label className="form-label">Checklist</Label>
                      <div className="checklist-items">
                        {tempTradeChecklists.map((item, index) => (
                          <div key={index} className="checklist-item">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...tempTradeChecklists];
                                updated[index].is_checked = !updated[index].is_checked;
                                setTempTradeChecklists(updated);
                              }}
                              className="checklist-checkbox"
                            >
                              {item.is_checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                            <span className={item.is_checked ? 'checklist-text-checked' : ''}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <Label htmlFor="notes" className="form-label">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any trade notes here"
                      value={newTrade.notes}
                      onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})}
                      className="form-textarea"
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="tradeImage" className="form-label">Screenshot (Optional)</Label>
                    <Input
                      id="tradeImage"
                      type="file"
                      accept="image/*"
                      onChange={handleNewTradeImageSelect}
                      className="form-input"
                    />
                    {newTradeImagePreview && (
                      <div className="image-preview-container" style={{ marginTop: '0.75rem', position: 'relative' }}>
                        <img
                          src={newTradeImagePreview}
                          alt="Trade preview"
                          style={{
                            maxWidth: '200px',
                            maxHeight: '200px',
                            borderRadius: '0.5rem',
                            objectFit: 'cover'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveNewTradeImage}
                          style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <Button type="submit" className="btn-primary-form" disabled={uploadingImage}>
                      {uploadingImage ? 'Uploading...' : 'Save Trade'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingTrade(false)}
                      className="btn-outline-form"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Setup Management Dialog */}
        <Dialog open={isManagingSetups} onOpenChange={setIsManagingSetups}>
          <DialogContent className="setup-dialog max-w-3xl">
            <DialogHeader>
              <DialogTitle>Manage Trading Setups</DialogTitle>
              <DialogDescription>
                Create setups and define checklist templates for each one
              </DialogDescription>
            </DialogHeader>

            <div className="setup-management">
              <div className="add-setup-section">
                <Input
                  placeholder="New setup name (e.g., Breakout, Reversal)"
                  value={newSetupName}
                  onChange={(e) => setNewSetupName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSetup()}
                  className="form-input"
                />
                <Button onClick={handleAddSetup} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Add Setup
                </Button>
              </div>

              <div className="setups-list">
                {setups.length === 0 ? (
                  <div className="empty-state">
                    <p>No setups created yet</p>
                  </div>
                ) : (
                  setups.map(setup => (
                    <div key={setup.id} className="setup-card">
                      <div className="setup-header">
                        <h3 className="setup-name">{setup.name}</h3>
                        <button
                          onClick={() => handleDeleteSetup(setup.id)}
                          className="btn-delete-small"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="setup-checklist-section">
                        <Label className="form-label text-sm">Checklist Template</Label>
                        <div className="add-checklist-item">
                          <Input
                            placeholder="Add checklist item..."
                            value={newChecklistItem[setup.id] || ''}
                            onChange={(e) => setNewChecklistItem({ ...newChecklistItem, [setup.id]: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistTemplate(setup.id)}
                            className="form-input"
                          />
                          <Button
                            onClick={() => handleAddChecklistTemplate(setup.id)}
                            size="sm"
                            className="btn-primary"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="checklist-template-list">
                          {checklistTemplates[setup.id]?.map(template => (
                            <div key={template.id} className="checklist-template-item">
                              <span>{template.text}</span>
                              <button
                                onClick={() => handleDeleteChecklistTemplate(setup.id, template.id)}
                                className="btn-delete-icon"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Trade Dialog */}
        <Dialog open={isEditingTrade} onOpenChange={setIsEditingTrade}>
          <DialogContent className="trade-dialog">
            <DialogHeader>
              <DialogTitle>Edit Trade</DialogTitle>
              <DialogDescription>
                Update your trade information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateTrade} className="trade-form">
              <div className="form-row">
                <div className="form-group">
                  <Label htmlFor="editDate" className="form-label">Date</Label>
                  <Input
                    id="editDate"
                    type="date"
                    value={editTrade.date}
                    onChange={(e) => setEditTrade({...editTrade, date: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="editPair" className="form-label">Trading Pair</Label>
                  <Input
                    id="editPair"
                    type="text"
                    placeholder="XAUUSD"
                    value={editTrade.pair}
                    onChange={(e) => setEditTrade({...editTrade, pair: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <Label htmlFor="editPosition" className="form-label">Position</Label>
                  <Select value={editTrade.position} onValueChange={(value: 'Long' | 'Short') => setEditTrade({...editTrade, position: value})}>
                    <SelectTrigger className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Long">Long</SelectItem>
                      <SelectItem value="Short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <Label htmlFor="editSetup" className="form-label">Setup</Label>
                  <Select value={editTrade.setup_id} onValueChange={(setupId) => setEditTrade({...editTrade, setup_id: setupId})}>
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="Select a setup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO_SETUP">None</SelectItem>
                      {setups.map(setup => (
                        <SelectItem key={setup.id} value={setup.id}>{setup.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="form-group">
                <Label htmlFor="editPnlAmount" className="form-label">P&L Amount (USD)</Label>
                <Input
                  id="editPnlAmount"
                  type="number"
                  step="0.01"
                  placeholder="Enter P&L amount (e.g., 150.50 or -75.25)"
                  value={editTrade.pnl_amount}
                  onChange={(e) => setEditTrade({...editTrade, pnl_amount: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="editNotes" className="form-label">Notes</Label>
                <Textarea
                  id="editNotes"
                  placeholder="Add any trade notes here"
                  value={editTrade.notes}
                  onChange={(e) => setEditTrade({...editTrade, notes: e.target.value})}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <Button type="submit" className="btn-primary-form">
                  Update Trade
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingTrade(false)}
                  className="btn-outline-form"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Trades Table */}
        <div className="trades-section">
          {accounts.length === 0 ? (
            <div className="empty-state">
              <BookOpen className="empty-icon" />
              <p>No trading accounts found</p>
              <p className="empty-subtitle">Create a trading account first to start journaling</p>
              <Button onClick={() => router.push('/account')} className="btn-primary">
                Go to Account
              </Button>
            </div>
          ) : trades.length === 0 ? (
            <div className="empty-state">
              <BookOpen className="empty-icon" />
              <p>No trades recorded yet</p>
              <p className="empty-subtitle">Start by adding your first trade</p>
              <button onClick={() => setIsAddingTrade(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add Your First Trade
              </button>
            </div>
          ) : (
            <div className="trades-list">
              {trades.map((trade) => (
                <div key={trade.id} className="trade-card">
                  <div className="trade-card-header">
                    <div className="trade-card-info">
                      <div className="trade-card-date">{new Date(trade.date).toLocaleDateString()}</div>
                      <div className="trade-card-pair">{trade.pair}</div>
                      <span className={`position-badge ${trade.position.toLowerCase()}`}>
                        {trade.position}
                      </span>
                      <div className="trade-card-setup">Setup: {getSetupName(trade.setup_id)}</div>
                    </div>
                    <div className="trade-card-actions">
                      {trade.pnl_amount !== null && (
                        <span className={`pnl-amount-large ${getPnLClass(trade)}`}>
                          {trade.pnl_amount >= 0 ? '+' : ''}{trade.pnl_amount.toFixed(2)} USD
                        </span>
                      )}
                      <button
                        className="btn-edit"
                        onClick={() => handleEditTrade(trade)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteTrade(trade.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {tradeChecklists[trade.id] && tradeChecklists[trade.id].length > 0 && (
                    <div className="trade-card-checklist">
                      <div className="checklist-title">Checklist:</div>
                      <div className="checklist-items">
                        {tradeChecklists[trade.id].map(item => (
                          <div key={item.id} className="checklist-item">
                            <button
                              onClick={() => handleToggleChecklistItem(trade.id, item.id)}
                              className="checklist-checkbox"
                            >
                              {item.is_checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                            <span className={item.is_checked ? 'checklist-text-checked' : ''}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trade.notes && (
                    <div className="trade-card-notes">
                      <div className="notes-title">Notes:</div>
                      <div className="notes-content">{trade.notes}</div>
                    </div>
                  )}

                  {trade.image_url && (
                    <div className="trade-card-image">
                      <div className="notes-title">Screenshot:</div>
                      <img
                        src={trade.image_url}
                        alt="Trade screenshot"
                        className="trade-thumbnail"
                        onClick={() => setEnlargedImage(trade.image_url)}
                        style={{
                          maxWidth: '150px',
                          maxHeight: '150px',
                          borderRadius: '0.5rem',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          marginTop: '0.5rem',
                          border: '2px solid var(--border-color)',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Enlargement Dialog */}
      {enlargedImage && (
        <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Trade Screenshot</DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src={enlargedImage}
                alt="Enlarged trade screenshot"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '0.5rem'
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
