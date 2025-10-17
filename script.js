document.addEventListener('DOMContentLoaded', () => {
    // --- Menu Hamburger ---
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
            hamburger.classList.toggle('is-active');
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('nav-active')) {
                    navLinks.classList.remove('nav-active');
                    hamburger.classList.remove('is-active');
                }
            });
        });
    }

    // --- Sistema de Reservas ---
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        const cabinSelect = document.getElementById('cabin');
        const guestsInput = document.getElementById('guests');
        const dateRangeInput = document.getElementById('date-range');
        const totalPriceElement = document.getElementById('total-price');
        let calendarInstance = null;

        // URL da planilha para buscar reservas existentes
        const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/120tGBDlo2TBFCLQjYqmBDoSkhA8xznB1eXsps_R0DJY/gviz/tq?tqx=out:csv&gid=934324739';

        async function getBlockedDates(cabinId) {
            const blockedDates = [];
            try {
                const response = await fetch(GOOGLE_SHEET_CSV_URL);
                const csvText = await response.text();
                const rows = csvText.split('\n').slice(1);

                rows.forEach(row => {
                    const columns = row.split('"').join('').split(',');
                    if (columns.length >= 7 && columns[3] === cabinId) {
                        blockedDates.push({
                            from: columns[5], // check-in
                            to: columns[6]    // check-out
                        });
                    }
                });
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
            }
            return blockedDates;
        }

        async function setupCalendar(cabinId) {
            try {
                const blockedDates = await getBlockedDates(cabinId);

                if (calendarInstance) {
                    calendarInstance.destroy();
                }

                calendarInstance = flatpickr(dateRangeInput, {
                    mode: "range",
                    minDate: "today",
                    dateFormat: "d/m/Y",
                    disable: blockedDates,
                    locale: {
                        firstDayOfWeek: 0,
                        weekdays: { 
                            shorthand: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], 
                            longhand: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'] 
                        },
                        months: { 
                            shorthand: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], 
                            longhand: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] 
                        },
                    },
                    onChange: function(selectedDates) {
                        calculateTotal(selectedDates);
                    }
                });
                dateRangeInput.placeholder = "Selecione o período";
            } catch (error) {
                console.error("Erro no calendário:", error);
                alert("Erro ao carregar datas. Tente novamente.");
            }
        }

        cabinSelect.addEventListener('change', (e) => {
            const selectedCabin = e.target.value;
            if (selectedCabin) {
                setupCalendar(selectedCabin);
            }
        });

        function calculateTotal(dates) {
            const guests = parseInt(guestsInput.value, 10);

            if (dates.length < 2 || isNaN(guests)) {
                totalPriceElement.textContent = 'R$ 0,00';
                return;
            }

            const [checkinDate, checkoutDate] = dates;
            const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
            const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

            if (nights <= 0) {
                totalPriceElement.textContent = 'R$ 0,00';
                return;
            }

            const baseCabinPrice = 200;
            const basePersonPrice = 80;
            const extraNightCabinPrice = 100;
            const extraNightPersonPrice = 40;

            let total = 0;
            total += baseCabinPrice + (guests * basePersonPrice);
            if (nights > 1) {
                total += (nights - 1) * (extraNightCabinPrice + (guests * extraNightPersonPrice));
            }
            
            totalPriceElement.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        guestsInput.addEventListener('input', () => {
            if (calendarInstance && calendarInstance.selectedDates.length === 2) {
                calculateTotal(calendarInstance.selectedDates);
            }
        });

        // --- SOLUÇÃO SIMPLES E EFETIVA ---
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const clientName = document.getElementById('client-name').value;
            const clientPhone = document.getElementById('client-phone').value;
            const cabinId = cabinSelect.value;
            const guests = guestsInput.value;
            const dates = calendarInstance ? calendarInstance.selectedDates : [];

            // Validação
            if (!clientName || !clientPhone || !cabinId || !guests || dates.length < 2) {
                alert("Por favor, preencha todos os campos corretamente.");
                return;
            }

            const [checkin, checkout] = dates;
            
            // Formata as datas
            const checkinFormatted = `${checkin.getDate().toString().padStart(2, '0')}/${(checkin.getMonth() + 1).toString().padStart(2, '0')}/${checkin.getFullYear()}`;
            const checkoutFormatted = `${checkout.getDate().toString().padStart(2, '0')}/${(checkout.getMonth() + 1).toString().padStart(2, '0')}/${checkout.getFullYear()}`;

            // Cria mensagem para WhatsApp
            const message = `🏕️ *NOVA RESERVA - CAMPING VALE VERDE* 🏕️\n\n` +
                           `*Nome:* ${clientName}\n` +
                           `*Telefone:* ${clientPhone}\n` +
                           `*Cabana:* ${cabinId}\n` +
                           `*Pessoas:* ${guests}\n` +
                           `*Check-in:* ${checkinFormatted}\n` +
                           `*Check-out:* ${checkoutFormatted}\n` +
                           `*Valor Total:* ${totalPriceElement.textContent}\n\n` +
                           `_Reserva solicitada via site_`;

            // Codifica a mensagem para URL
            const encodedMessage = encodeURIComponent(message);
            
            // Número do WhatsApp do camping (substitua pelo seu)
            const whatsappNumber = '5554996387239';
            
            // Abre WhatsApp com a mensagem pré-preenchida
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
            
            // Abre o WhatsApp
            window.open(whatsappUrl, '_blank');
            
            // Mensagem de confirmação
            alert('✅ Pedido de reserva criado!\\n\\nAgora basta:' +
                  '\\n1. ENVIAR a mensagem no WhatsApp que abriu' +
                  '\\n2. Nós confirmaremos sua reserva em até 2 horas!' +
                  '\\n\\nObrigado pela preferência! 🏕️');

            // Limpa o formulário
            bookingForm.reset();
            totalPriceElement.textContent = 'R$ 0,00';
            if(calendarInstance) {
                calendarInstance.clear();
            }
            dateRangeInput.placeholder = "Escolha a cabana primeiro";
        });
    }
});
