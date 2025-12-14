import { supabase } from '../config/supabase';
import { authService } from './authService';

export const paymentService = {
  /**
   * Create a payment for an order
   */
  async createPayment(paymentData) {
    try {
      const currentUser = authService.getCurrentUser();

      const paymentRecord = {
        order_id: paymentData.order_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method, // 'cash', 'card', 'upi'
        payment_status: 'completed',
        transaction_reference: paymentData.transaction_reference || null,
        cash_received: paymentData.cash_received || null,
        change_amount: paymentData.change_amount || null,
        paid_by_name: paymentData.paid_by_name || null,
        notes: paymentData.notes || null,
        created_by: currentUser?.id
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentRecord])
        .select()
        .single();

      if (error) throw error;

      // Update order payment status and paid amount
      await this.updateOrderPaymentStatus(paymentData.order_id);

      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  /**
   * Create split payment
   */
  async createSplitPayment(orderId, splits) {
    try {
      const currentUser = authService.getCurrentUser();

      // Create main payment record
      const totalAmount = splits.reduce((sum, split) => sum + parseFloat(split.amount), 0);

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          order_id: orderId,
          amount: totalAmount,
          payment_method: 'split', // We'll mark split payments differently
          payment_status: 'completed',
          created_by: currentUser?.id,
          notes: `Split payment (${splits.length} parts)`
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create split records
      const splitRecords = splits.map(split => ({
        payment_id: payment.id,
        split_amount: split.amount,
        payment_method: split.payment_method,
        paid_by_name: split.paid_by_name || null,
        transaction_reference: split.transaction_reference || null,
        notes: split.notes || null
      }));

      const { data: splitData, error: splitError } = await supabase
        .from('payment_splits')
        .insert(splitRecords)
        .select();

      if (splitError) throw splitError;

      // Update order payment status
      await this.updateOrderPaymentStatus(orderId);

      return { payment, splits: splitData };
    } catch (error) {
      console.error('Error creating split payment:', error);
      throw error;
    }
  },

  /**
   * Update order payment status based on payments
   */
  async updateOrderPaymentStatus(orderId) {
    try {
      // Get order total
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Get sum of all payments for this order
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('order_id', orderId)
        .eq('payment_status', 'completed');

      if (paymentsError) throw paymentsError;

      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalAmount = parseFloat(order.total_amount);

      // Determine payment status
      let paymentStatus = 'unpaid';
      if (totalPaid >= totalAmount) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      // Update order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          paid_amount: totalPaid,
          payment_status: paymentStatus,
          bill_generated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      return { totalPaid, paymentStatus };
    } catch (error) {
      console.error('Error updating order payment status:', error);
      throw error;
    }
  },

  /**
   * Get all payments for an order
   */
  async getOrderPayments(orderId) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          payment_splits (*)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order payments:', error);
      throw error;
    }
  },

  /**
   * Get order payment summary
   */
  async getOrderPaymentSummary(orderId) {
    try {
      const { data, error } = await supabase.rpc('get_order_payment_summary', {
        order_id_param: orderId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      throw error;
    }
  },

  /**
   * Calculate change for cash payment
   */
  calculateChange(totalAmount, cashReceived) {
    const change = parseFloat(cashReceived) - parseFloat(totalAmount);
    return change >= 0 ? change : 0;
  },

  /**
   * Validate payment amount
   */
  validatePaymentAmount(paymentAmount, orderTotal, paidAmount = 0) {
    const remaining = parseFloat(orderTotal) - parseFloat(paidAmount);
    const payment = parseFloat(paymentAmount);

    return {
      isValid: payment > 0 && payment <= remaining,
      remaining,
      payment,
      willOverpay: payment > remaining
    };
  },

  /**
   * Calculate split amounts equally
   */
  calculateEqualSplit(totalAmount, numberOfPeople) {
    const amount = parseFloat(totalAmount);
    const people = parseInt(numberOfPeople);

    if (people <= 0) return [];

    const amountPerPerson = (amount / people).toFixed(2);
    const splits = [];

    for (let i = 0; i < people; i++) {
      splits.push({
        amount: parseFloat(amountPerPerson),
        payment_method: 'cash',
        paid_by_name: `Person ${i + 1}`
      });
    }

    // Adjust last split to account for rounding
    const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
    const difference = amount - totalSplit;
    if (difference !== 0) {
      splits[splits.length - 1].amount += difference;
      splits[splits.length - 1].amount = parseFloat(splits[splits.length - 1].amount.toFixed(2));
    }

    return splits;
  },

  /**
   * Refund a payment
   */
  async refundPayment(paymentId, reason) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({
          payment_status: 'refunded',
          notes: reason
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      // Get order ID and recalculate payment status
      await this.updateOrderPaymentStatus(data.order_id);

      return data;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }
};

export default paymentService;
