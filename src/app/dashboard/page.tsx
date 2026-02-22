import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import DataTable from './DataTable';
import SummaryCard from './SummaryCard';

const Dashboard = () => {
    const [open, setOpen] = React.useState(false);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <div>
            <h1>Dashboard</h1>
            <div className="summary-cards">
                <SummaryCard title="Total Products" value="100" />
                <SummaryCard title="Total Sales" value="$5000" />
                <SummaryCard title="Total Users" value="200" />
            </div>
            <Button variant="outlined" color="primary" onClick={handleClickOpen}>
                Add Product
            </Button>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogContent>
                    {/* Add Product Form Goes Here */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleClose} color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
            <DataTable />
        </div>
    );
};

export default Dashboard;