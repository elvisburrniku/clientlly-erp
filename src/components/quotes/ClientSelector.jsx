import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function ClientSelector({ selectedClient, onClientSelect }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    nipt: '',
    address: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await base44.entities.Client.list('-created_date', 100);
    setClients(data);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNewClient = async () => {
    if (!newClient.name || !newClient.email) return;
    
    await base44.entities.Client.create({
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone,
      nipt: newClient.nipt,
      address: newClient.address,
    });

    onClientSelect({
      client_name: newClient.name,
      client_email: newClient.email,
      client_phone: newClient.phone,
      client_nipt: newClient.nipt,
      client_address: newClient.address,
    });

    setNewClient({ name: '', email: '', phone: '', nipt: '', address: '' });
    setShowNewClientDialog(false);
    setIsOpen(false);
    loadClients();
  };

  return (
    <>
      <div className="relative">
        <div className="flex items-center gap-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Kërko ose zgjidh klient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {filteredClients.length === 0 && search && (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">Nuk u gjet klient me këtë emër</p>
                <Button size="sm" onClick={() => setShowNewClientDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Regjistro Klient të Ri
                </Button>
              </div>
            )}

            {filteredClients.length > 0 && (
              <div className="py-1">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      onClientSelect({
                        client_name: client.name,
                        client_email: client.email,
                        client_phone: client.phone || '',
                        client_nipt: client.nipt || '',
                        client_address: client.address || '',
                      });
                      setSearch('');
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-muted transition"
                  >
                    <div className="text-sm font-medium">{client.name}</div>
                    <div className="text-xs text-muted-foreground">{client.email}</div>
                  </button>
                ))}
              </div>
            )}

            {!search && clients.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">Nuk ka klientë</p>
                <Button size="sm" onClick={() => setShowNewClientDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Regjistro Klientin e Parë
                </Button>
              </div>
            )}

            {!search && clients.length > 0 && (
              <div className="p-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => setShowNewClientDialog(true)} className="w-full gap-2">
                  <Plus className="w-4 h-4" /> Regjistro Klient të Ri
                </Button>
              </div>
            )}
          </div>
        )}

        {selectedClient && (
          <button
            onClick={() => {
              setSearch('');
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regjistro Klient të Ri</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Emri *</label>
              <Input
                placeholder="Emri i klientit"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Email *</label>
              <Input
                type="email"
                placeholder="Email i klientit"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Telefon</label>
              <Input
                placeholder="Numri i telefonit"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">NIPT</label>
              <Input
                placeholder="NIPT"
                value={newClient.nipt}
                onChange={(e) => setNewClient({ ...newClient, nipt: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Adresa</label>
              <Textarea
                placeholder="Adresa e klientit"
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClientDialog(false)}>Anulo</Button>
            <Button onClick={handleAddNewClient}>Regjistro Klientin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}